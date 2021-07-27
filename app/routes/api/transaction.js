"use strict";

const getList = {
    method: "GET",
    path: "/api/transaction/get-list",
    handler: async ( request, h ) => {
        try {
            let params = request.query

            let page = parseInt(params.page)
            let limit = parseInt(params.limit)
            let offset = (page - 1) * limit

            const getList = await h.sql`
                SELECT t.id, t.date, p.sku, t.qty, t.amount FROM transactions t
                LEFT JOIN products p
                ON t.product_id = p.id
                ORDER BY t.date desc
                OFFSET ${offset}
                LIMIT ${limit}
            `
            const result = {
                status: true,
                message: 'transactions list found',
                data: getList
            }
            return result
        } catch ( err ) {
            const result = {
                status: false,
                message: 'failed to fethc transactions list data!',
                data: {}
            }
            return result 
        }
    },
};

const getDetail = {
    method: "GET",
    path: "/api/transaction/get-detail",
    handler: async ( request, h ) => {
        try {
            let params = request.query

            let id = parseInt(params.id)

            const getDetail = await h.sql`
                SELECT t.id, t.date, p.sku, t.qty, t.amount FROM transactions t
                LEFT JOIN products p
                ON t.product_id = p.id
                WHERE t.id = ${id}
            `
            const result = {
                status: true,
                message: 'Transaction detail found',
                data: getDetail
            }
            return result
        } catch ( err ) {
            const result = {
                status: false,
                message: 'failed to fetch transactions detail data!',
                data: {}
            }
            return result 
        }
    },
};

const submitTransaction = {
    method: "POST",
    path: "/api/transaction/submit",
    handler: async ( request, h ) => {
      try {
        let params = request.payload

        let id = params.id
        let sku = params.sku
        let qty = params.qty
        let date = new Date()

        let product = await h.sql`
            SELECT p.id, p.price, pd.stock, p.product_number FROM products p
            LEFT JOIN product_details pd
            ON p.product_number = pd.product_number
            WHERE sku = ${sku}
        `
        let amount = 0
        let updatedQty = 0
        if(product[0]['stock'] > 0 && parseInt(qty) < parseInt(product[0]['stock'])) {
            if(id == "" || id == 0) {
                amount = product[0]['price'] * parseInt(qty)
                updatedQty = parseInt(product[0]['stock']) - parseInt(qty)
                let transactions = await h.sql`
                    INSERT INTO transactions(date, product_id, amount, qty)
                    VALUES(${date}, ${product[0]['id']}, ${amount}, ${qty})
                `

                if(transactions) {
                    await h.sql`
                        UPDATE product_details
                        SET stock = ${updatedQty}
                        WHERE product_number = ${product[0]['product_number']}
                    `
                }
            } else {
                let checkTransaction = await h.sql`
                    SELECT * FROM transactions t
                    WHERE t.id = ${id}
                `
                if(checkTransaction[0]['product_id'] == product[0]['id']) {
                    let diffQty = 0
                    let updatedStock = 0
                    if(qty > checkTransaction[0]['qty']) {
                        diffQty = qty - checkTransaction[0]['qty']
                        updatedStock = product[0]['stock'] - diffQty
                    } else {
                        diffQty = checkTransaction[0]['qty'] - qty
                        updatedStock = product[0]['stock'] + diffQty
                    }
                    let updatedQty = qty
                    let updatedAmount = qty * product[0]['price']
                    let transaction = await h.sql`
                        UPDATE transactions
                        SET qty = ${updatedQty}, amount = ${updatedAmount}
                        WHERE id = ${id}
                    `
                    if(transaction) {
                        await h.sql`
                            UPDATE product_details
                            SET stock = ${updatedStock}
                            WHERE product_number = ${product[0]['product_number']}
                        `
                    }
                } else {
                    let productOld = await h.sql`
                        SELECT p.id, p.price, pd.stock, p.product_number FROM products p
                        LEFT JOIN product_details pd
                        ON p.product_number = pd.product_number
                        WHERE p.id = ${checkTransaction[0]['product_id']}
                    `

                    let returnStock = checkTransaction[0]['qty'] + productOld[0]['stock']
                    await h.sql`
                        UPDATE product_details
                        SET stock = ${returnStock}
                        WHERE product_number = ${productOld[0]['product_number']}
                    `
                    let updatedAmount = qty * product[0]['price']
                    let transaction = await h.sql`
                        UPDATE transactions
                        SET qty = ${qty}, amount = ${updatedAmount}
                        WHERE id = ${id}
                    `

                    let updatedStock = product[0]['stock'] - qty
                    if(transaction) {
                        await h.sql`
                            UPDATE product_details
                            SET stock = ${updatedStock}
                            WHERE product_number = ${product[0]['product_number']}
                        `
                    }
                }
            }
            const result = {
                status: true,
                message: 'successfully submit transactions',
                data: {}
            }
            return result
        } else {
            const result = {
                status: false,
                message: 'product not available',
                data: {}
            }
            return result
        }
      } catch ( err ) {
            const result = {
                status: false,
                message: 'transactions failed to submit!',
                data: {}
            }
            return result 
      }
    },
};

const deleteTransaction = {
    method: "POST",
    path: "/api/transaction/delete",
    handler: async ( request, h ) => {
      try {
        let params = request.payload

        let id = parseInt(params.id)

        let checkTransaction = await h.sql`
            SELECT * FROM transactions
            WHERE id = ${id}
        `

        if(checkTransaction[0]) {
            let product = await h.sql`
                SELECT * FROM products p
                LEFT JOIN product_details pd
                ON p.product_number = pd.product_number
                WHERE p.id = ${checkTransaction[0]['product_id']}
            `

            let returnQty =  product[0]['stock'] + checkTransaction[0]['qty']
            let updateData = await h.sql`
                UPDATE product_details
                SET stock = ${returnQty}
                WHERE product_number = ${product[0]['product_number']}
            `

            if(updateData['count'] > 0) {
                await h.sql`
                    DELETE FROM transactions
                    WHERE id = ${id}
                `

                const result = {
                    status: true,
                    message: 'transactions successfully deleted',
                    data: {}
                }
                return result
            }
        }
      } catch ( err ) {  
            const result = {
                status: false,
                message: 'transactions failed to delete!',
                data: {}
            }
            return result  
      }
    },
};


module.exports = [
    getList,
    getDetail,
    submitTransaction,
    deleteTransaction
]