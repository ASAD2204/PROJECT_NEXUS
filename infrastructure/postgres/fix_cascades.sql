DO $$
DECLARE
    r RECORD;
BEGIN
    -- This script iterates through EVERY foreign key in the database 
    -- and ensures it is set to ON DELETE CASCADE.
    -- This enables deep permanent deletion of complex entities like Teachers.
    FOR r IN (
        SELECT 
            tc.constraint_name, 
            tc.table_name, 
            tc.table_schema,
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
    ) LOOP
        BEGIN
            EXECUTE 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name) || ' DROP CONSTRAINT ' || quote_ident(r.constraint_name);
            EXECUTE 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name) || ' ADD CONSTRAINT ' || quote_ident(r.constraint_name) || 
                    ' FOREIGN KEY (' || quote_ident(r.column_name) || ') REFERENCES ' || quote_ident(r.table_schema) || '.' || quote_ident(r.foreign_table_name) || 
                    ' (' || quote_ident(r.foreign_column_name) || ') ON DELETE CASCADE';
            -- RAISE NOTICE 'Updated % on % to CASCADE', r.constraint_name, r.table_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipping %: %', r.constraint_name, SQLERRM;
        END;
    END LOOP;
END $$;
