"use strict";

module.exports = {
    insertProduct: async ( request, h ) => {
        let sql = await h.sql`INSERT INTO products (name, sku, image, description, price)
        VALUES ('test', 'sku-1', 'string', 'stringdesc', '1000')`

        return sql
    },
};