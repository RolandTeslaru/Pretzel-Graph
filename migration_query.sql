UPDATE public.workflows
SET data = jsonb_set(
    data,
    '{nodes}',
    COALESCE(
        (
            SELECT jsonb_object_agg(
                node_id,
                CASE
                    -- If inputs exist and are an object, process them
                    WHEN (node_val #> '{data,inputs}') IS NOT NULL 
                         AND jsonb_typeof(node_val #> '{data,inputs}') = 'object' THEN
                        jsonb_set(
                            node_val,
                            '{data,inputs}',
                            COALESCE(
                                (
                                    SELECT jsonb_object_agg(
                                        input_id,
                                        CASE
                                            -- Rename 'langChainDataTypes' to 'handleVariants' if present
                                            WHEN input_val ? 'langChainDataTypes' THEN
                                                (input_val - 'langChainDataTypes') || jsonb_build_object('handleVariants', input_val -> 'langChainDataTypes')
                                            ELSE
                                                input_val
                                        END
                                    )
                                    FROM jsonb_each(node_val #> '{data,inputs}') AS inputs(input_id, input_val)
                                ),
                                '{}'::jsonb -- Handle empty inputs object
                            )
                        )
                    ELSE
                        node_val
                END
            )
            FROM jsonb_each(data -> 'nodes') AS nodes(node_id, node_val)
        ),
        '{}'::jsonb -- Handle empty nodes object in a weird case
    )
)
WHERE data ? 'nodes';
