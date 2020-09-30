CREATE OR REPLACE FUNCTION %function_name%()
	RETURNS trigger AS $BODY$
	DECLARE
		rec RECORD;
		proc VARCHAR(6);
    BEGIN
		CASE TG_OP
			WHEN 'INSERT' THEN
				rec := NEW;
				proc := 'INSERT';
			WHEN 'UPDATE' THEN
				rec := NEW;
				proc := 'UPDATE';
			WHEN 'DELETE' THEN
				rec := OLD;
				proc := 'DELETE';
			ELSE
				RAISE EXCEPTION 'Unknown TG_OP: "%". Should not occur!', TG_OP;
			END CASE;
		  
        PERFORM pg_notify('%topic_name%', row_to_json(ROW(proc, rec))::text);
        RETURN NULL;
    END; 
$BODY$
	LANGUAGE plpgsql VOLATILE
	COST 100;