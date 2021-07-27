"use strict";

const Wreck = require('@hapi/wreck');
var parser = require('xml2json');
const xml2js = require('xml2js');

const wreck = Wreck.defaults({
  headers: {
      'Accept-Charset': 'utf-8',
  }
});

const syncProduct = {
    method: "POST",
    path: "/api/product/sync",
    handler: async ( request, h ) => {
      try {
        let headers = request.headers
        const options = {
            baseUrl: 'http://api.elevenia.co.id',
            headers: {
                openapikey: headers.openapikey,
                'Content-Type': 'application/xml',
            }
        };
        for(let i = 1; 1 < 99; i++) {
            const method = 'GET';
            const uri = '/rest/prodservices/product/listing?page='+i;

            const promise = wreck.request(method, uri, options);
            const res = await promise;
            const body = await Wreck.read(res, options);

            let json = parser.toJson(body);
            let parse = JSON.parse(json)
            let products = parse['Products']['product']
            if(products) {
                for(let x in products) {
                    let productNo = products[x]['prdNo']
                    let productName = products[x]['prdNm']
                    let sellPrice = products[x]['selPrc']
                    let imageProduct = (products[x]['prdImage01'] != null ? products[x]['prdImage01'] : '')
                    let sku = (products[x]['sellerPrdCd'] != null ? products[x]['sellerPrdCd'] : '')
                    let description = (products[x]['htmlDetail'] != null ? products[x]['htmlDetail'] : '')

                    // check existing SKU
                    let checkSku = await h.sql`
                            SELECT * FROM products WHERE sku = ${sku}
                    `
                    
                    if(checkSku['count'] == 0) {
                        // insert products
                        let items = await h.sql`
                            INSERT INTO products(name, sku, image, price, description, product_number)
                            VALUES(${productName}, ${sku}, ${imageProduct}, ${sellPrice}, ${description}, ${productNo})
                        `
                    }
                }
            } else {
              break
            }
        }

        let prdNos = await h.sql`
                SELECT product_number FROM products 
            `

        let ps = []
        if(prdNos) {
            for(let x in prdNos) {
                let product = {}
                if(prdNos[x]['product_number'] != undefined) {
                    product = {
                        ProductStock: {
                            prdNo: prdNos[x]['product_number']
                        }
                    }
                }

                ps.push(product)
            }
        }

        let pps = {
            ProductStocks: ps
        }
        const builder = new xml2js.Builder( { headless: false, renderOpts: { pretty: true }  });
        const xml = builder.buildObject(pps);

        const method = 'POST';
        const uri = '/rest/prodmarketservice/prodmarket/stocks';

        options['payload'] = xml

        const promise = wreck.request(method, uri, options);
        const res = await promise;
        const body = await Wreck.read(res, options);
        let json = parser.toJson(body);
        let parse = JSON.parse(json)
        let productstockss = parse['ProductStockss']
        let productstocks = productstockss['ProductStocks']

        let newData = []
        for(let x in productstocks){
            if(Array.isArray(productstocks[x]['ProductStock'])) {
                let sum = 0
                let ct = 0
                for(let i in productstocks[x]['ProductStock']) {
                    sum = sum + parseInt(productstocks[x]['ProductStock'][i]['stckQty'])
                    ct++
                    let dt = {
                        stock: sum,
                        prdNo: productstocks[x]['ProductStock'][i]['prdNo']
                    }

                    if(ct == productstocks[x]['ProductStock'].size) {
                        newData.push(dt)
                    }
                }
            } else {
                let dt = {
                    stock: parseInt(productstocks[x]['ProductStock']['stckQty']),
                    prdNo: productstocks[x]['prdNo']
                }
                newData.push(dt)
            }
        }

        for(let j in newData) {
            await h.sql`
                INSERT INTO product_details(stock, product_number)
                VALUES(${newData[j]['stock']}, ${newData[j]['prdNo']})
            `
        }

        const result = {
            status: true,
            message: 'fetch data completed',
            data: {}
        }
        return result
      } catch ( err ) {
        console.log( err );
        return false;
      }
    },
};

const getList = {
    method: "GET",
    path: "/api/product/get-list",
    handler: async ( request, h ) => {
      try {
        let params = request.query

        let page = parseInt(params.page)
        let limit = parseInt(params.limit)
        let offset = (page - 1) * limit

        const getList = await h.sql`
            SELECT p.id, p.name, p.sku, p.image, p.price, pd.stock FROM products p
            LEFT JOIN product_details pd
            ON p.product_number = pd.product_number
            ORDER BY p.id asc
            OFFSET ${offset}
            LIMIT ${limit}
        `
        const result = {
            status: true,
            message: 'product list found',
            data: getList
        }
        return result
      } catch ( err ) {
        const result = {
            status: false,
            message: 'failed to fetch product list',
            data: {}
        }
        return result
      }
    },
};

const getDetail = {
    method: "GET",
    path: "/api/product/get-detail",
    handler: async ( request, h ) => {
      try {
        let params = request.query

        let id = parseInt(params.id)

        const getDetail = await h.sql`
            SELECT p.id, p.name, p.sku, p.image, p.price, p.description FROM products p
            WHERE p.id = ${id}
        `
        const result = {
            status: true,
            message: 'product detail found',
            data: getDetail
        }
        return result
      } catch ( err ) {
        const result = {
            status: false,
            message: 'failed to fetch product data',
            data: {}
        }
        return result
      }
    },
};

const submitProduct = {
    method: "POST",
    path: "/api/product/submit",
    handler: async ( request, h ) => {
      try {
        let params = request.payload

        let productName = params.name
        let sku = params.sku
        let imageProduct = params.image
        let description = params.description
        let sellPrice = params.price
        let productNo = params.product_number
        let stock = params.stock

        let checkProduct = await h.sql`
            SELECT * FROM products p
            WHERE p.product_number = ${productNo}
        `

        if(checkProduct['count'] < 1) {
            await h.sql`
                INSERT INTO products(name, sku, image, price, description, product_number)
                VALUES(${productName}, ${sku}, ${imageProduct}, ${sellPrice}, ${description}, ${productNo})
            `
            await h.sql`
                INSERT INTO product_details(stock, product_number)
                VALUES(0, ${productNo})
            `
        } else {
            await h.sql`
                UPDATE products
                SET name = ${productName}, sku = ${sku}, image = ${imageProduct}, price = ${sellPrice}, description = ${description}
                WHERE id = ${checkProduct.id}
            `

            await h.sql`
                UPDATE product_details
                SET stock = ${stock}
                WHERE product_number = ${productNo}
            `
        }
        const result = {
            status: true,
            message: 'successfully submit product',
            data: {}
        }
        return result
      } catch ( err ) {
        const result = {
            status: false,
            message: 'product submit failed!',
            data: {}
        }
        return result
      }
    },
};

const deleteProduct = {
    method: "POST",
    path: "/api/product/delete",
    handler: async ( request, h ) => {
      try {
        let params = request.payload

        let id = parseInt(params.id)

        let checkProduct = await h.sql`
            SELECT * FROM products
            WHERE id = ${id}
        `
        const deleteDetail = await h.sql`
            DELETE FROM product_details pd
            WHERE pd.product_number = ${checkProduct.product_number}
        `

        const deleteProduct = await h.sql`
            DELETE FROM products p
            WHERE p.id = ${id}
        `
        const result = {
            status: true,
            message: 'product successfully deleted',
            data: {}
        }
        return result
      } catch ( err ) {
        const result = {
            status: false,
            message: 'product failed to delete!',
            data: {}
        }
        return result
      }
    },
};



module.exports = [
    syncProduct,
    getList,
    getDetail,
    submitProduct,
    deleteProduct
]