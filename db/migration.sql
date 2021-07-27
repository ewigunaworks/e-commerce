-- Table: public.products

-- DROP TABLE public.products;

CREATE TABLE public.products
(
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    name character varying COLLATE pg_catalog."default",
    sku character varying COLLATE pg_catalog."default",
    image character varying COLLATE pg_catalog."default",
    price integer,
    description character varying COLLATE pg_catalog."default",
    product_number character varying COLLATE pg_catalog."default",
    CONSTRAINT products_pkey PRIMARY KEY (id),
    CONSTRAINT products_product_number_unique UNIQUE (product_number),
    CONSTRAINT products_sku_unique UNIQUE (sku)
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

ALTER TABLE public.products
    OWNER to postgres;



-- Table: public.product_details

-- DROP TABLE public.product_details;

CREATE TABLE public.product_details
(
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    stock integer,
    product_number character varying COLLATE pg_catalog."default",
    CONSTRAINT product_details_pkey PRIMARY KEY (id)
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

ALTER TABLE public.product_details
    OWNER to postgres;


-- Table: public.transactions

-- DROP TABLE public.transactions;

CREATE TABLE public.transactions
(
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    date date,
    product_id integer,
    amount integer,
    qty integer,
    CONSTRAINT transactions_pkey PRIMARY KEY (id)
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

ALTER TABLE public.transactions
    OWNER to postgres;