UPDATE public.workflows
SET data = (
    SELECT jsonb_set(
        data,
        '{nodes}',
        COALESCE(
            (
                SELECT jsonb_object_agg(
                    node_id,
                    -- Step 2: Update Outputs on the result of Step 1 (Inputs)
                    CASE
                        WHEN (inputs_updated_node #> '{data,outputs}') IS NOT NULL AND jsonb_typeof(inputs_updated_node #> '{data,outputs}') = 'object' THEN
                             jsonb_set(
                                inputs_updated_node,
                                '{data,outputs}',
                                COALESCE(
                                    (
                                        SELECT jsonb_object_agg(
                                            output_id,
                                            CASE
                                                -- 1. Rename langChainDataTypes -> handleVariants
                                                WHEN output_val ? 'langChainDataTypes' THEN
                                                    (output_val - 'langChainDataTypes') || jsonb_build_object('handleVariants', output_val -> 'langChainDataTypes')
                                                -- 2. If handleVariants exists, keep it
                                                WHEN output_val ? 'handleVariants' THEN
                                                    output_val
                                                -- 3. Otherwise, set default [] to satisfy Zod schema
                                                ELSE
                                                    output_val || jsonb_build_object('handleVariants', '[]'::jsonb)
                                            END
                                        )
                                        FROM jsonb_each(inputs_updated_node #> '{data,outputs}') AS outputs(output_id, output_val)
                                    ),
                                    '{}'::jsonb
                                )
                             )
                        ELSE
                             inputs_updated_node
                    END
                )
                FROM jsonb_each(data -> 'nodes') AS nodes(node_id, node_val),
                LATERAL (
                    -- Step 1: Update Inputs
                    SELECT
                        CASE
                            WHEN (node_val #> '{data,inputs}') IS NOT NULL AND jsonb_typeof(node_val #> '{data,inputs}') = 'object' THEN
                                jsonb_set(
                                    node_val,
                                    '{data,inputs}',
                                    COALESCE(
                                        (
                                            SELECT jsonb_object_agg(
                                                input_id,
                                                CASE
                                                    -- 1. Rename langChainDataTypes -> handleVariants
                                                    WHEN input_val ? 'langChainDataTypes' THEN
                                                        (input_val - 'langChainDataTypes') || jsonb_build_object('handleVariants', input_val -> 'langChainDataTypes')
                                                    -- 2. If handleVariants exists, keep it
                                                    WHEN input_val ? 'handleVariants' THEN
                                                        input_val
                                                    -- 3. Otherwise, set default [] to satisfy Zod schema
                                                    ELSE
                                                        input_val || jsonb_build_object('handleVariants', '[]'::jsonb)
                                                END
                                            )
                                            FROM jsonb_each(node_val #> '{data,inputs}') AS inputs(input_id, input_val)
                                        ),
                                        '{}'::jsonb
                                    )
                                )
                            ELSE
                                node_val
                        END AS inputs_updated_node
                ) AS step1
            ),
            '{}'::jsonb
        )
    )
)
WHERE data ? 'nodes';
