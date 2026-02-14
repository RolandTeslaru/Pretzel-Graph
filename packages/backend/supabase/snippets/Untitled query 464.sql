-- ============================================================
-- Migration: Old Workflow schema → New Workflow schema (v2)
-- ============================================================
-- Changes:
--   1. Nodes: flatten data.inputs/outputs/ui to top level
--   2. Nodes: split old inputs into fields[] (primitives) and inputs[] (ports)
--   3. Nodes: convert old outputs record → outputs[] with port variant
--   4. Nodes: display_name → displayName, drop versionId
--   5. Edges: handleId → portId
--   6. Top-level: fieldValues → staticValues
--   7. Variant names: lowercase → PascalCase
-- ============================================================


-- ============================================================
-- 1. Map old lowercase variant → new PascalCase variant
-- ============================================================
CREATE OR REPLACE FUNCTION map_field_variant(old_variant text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
    RETURN CASE old_variant
        WHEN 'integer'     THEN 'Integer'
        WHEN 'float'       THEN 'Float'
        WHEN 'string'      THEN 'String'
        WHEN 'secret'      THEN 'Secret'
        WHEN 'boolean'     THEN 'Boolean'
        WHEN 'multiOption' THEN 'MultiOption'
        WHEN 'file'        THEN 'File'
        WHEN 'script'      THEN 'Script'
        WHEN 'json'        THEN 'Json'
        WHEN 'list'        THEN 'List'
        -- Already PascalCase (idempotent)
        WHEN 'Integer'     THEN 'Integer'
        WHEN 'Float'       THEN 'Float'
        WHEN 'String'      THEN 'String'
        WHEN 'Secret'      THEN 'Secret'
        WHEN 'Boolean'     THEN 'Boolean'
        WHEN 'MultiOption' THEN 'MultiOption'
        WHEN 'File'        THEN 'File'
        WHEN 'Script'      THEN 'Script'
        WHEN 'Json'        THEN 'Json'
        WHEN 'List'        THEN 'List'
        ELSE old_variant
    END;
END $$;


-- ============================================================
-- 2. Migrate a single edge: handleId → portId
-- ============================================================
CREATE OR REPLACE FUNCTION migrate_edge(edge_val jsonb)
RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
    new_source jsonb;
    new_target jsonb;
BEGIN
    new_source := jsonb_build_object(
        'nodeId', edge_val #>> '{source,nodeId}',
        'portId', COALESCE(edge_val #>> '{source,portId}', edge_val #>> '{source,handleId}')
    );

    new_target := jsonb_build_object(
        'nodeId', edge_val #>> '{target,nodeId}',
        'portId', COALESCE(edge_val #>> '{target,portId}', edge_val #>> '{target,handleId}')
    );

    RETURN jsonb_build_object(
        'id',     edge_val ->> 'id',
        'source', new_source,
        'target', new_target
    );
END $$;


-- ============================================================
-- 3. Migrate a single node
-- ============================================================
CREATE OR REPLACE FUNCTION migrate_node(node_val jsonb)
RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
    old_inputs       jsonb;
    old_outputs      jsonb;
    old_ui           jsonb;
    adv_order        jsonb;

    new_fields       jsonb := '[]'::jsonb;
    new_inputs       jsonb := '[]'::jsonb;
    new_outputs      jsonb := '[]'::jsonb;

    input_id         text;
    input_val        jsonb;
    output_id        text;
    output_val       jsonb;

    is_advanced      boolean;
    variant_mapped   text;
    port_variant     text;
    field_obj        jsonb;
    port_obj         jsonb;
    out_obj          jsonb;
BEGIN
    old_inputs  := node_val #> '{data,inputs}';
    old_outputs := node_val #> '{data,outputs}';
    old_ui      := node_val #> '{data,ui}';
    adv_order   := COALESCE(old_ui -> 'advancedInputsOrder', '[]'::jsonb);

    -- ── SPLIT INPUTS → fields[] + inputs[] ──
    IF old_inputs IS NOT NULL AND jsonb_typeof(old_inputs) = 'object' THEN
        FOR input_id, input_val IN SELECT * FROM jsonb_each(old_inputs)
        LOOP
            IF (input_val ->> 'isRuntime')::boolean IS TRUE THEN
                -- ── PORT INPUT ──
                port_variant := COALESCE(
                    input_val #>> '{langChainDataTypes,0}',
                    input_val #>> '{handleVariants,0}',
                    'Message'
                );

                port_obj := jsonb_build_object(
                    'id',          input_id,
                    'variant',     port_variant,
                    'required',    COALESCE((input_val ->> 'required')::boolean, true),
                    'displayName', COALESCE(input_val #>> '{uiData,displayName}', input_id),
                    'tooltip',     input_val #>> '{uiData,tooltip}'
                );

                IF port_variant IN ('Message', 'Text') AND input_val ? 'initialValue' THEN
                    port_obj := port_obj || jsonb_build_object('initialValue', input_val -> 'initialValue');
                END IF;

                new_inputs := new_inputs || jsonb_build_array(port_obj);
            ELSE
                -- ── FIELD ──
                variant_mapped := map_field_variant(input_val ->> 'variant');

                is_advanced := adv_order @> to_jsonb(input_id);

                field_obj := jsonb_build_object(
                    'id',           input_id,
                    'variant',      variant_mapped,
                    'required',     COALESCE((input_val ->> 'required')::boolean, true),
                    'advanced',     COALESCE(is_advanced, false),
                    'reconcile',    COALESCE((input_val ->> 'reconcile')::boolean, false),
                    'displayName',  COALESCE(input_val #>> '{uiData,displayName}', input_id),
                    'tooltip',      input_val #>> '{uiData,tooltip}',
                    'initialValue', input_val -> 'initialValue'
                );

                CASE variant_mapped
                    WHEN 'Integer', 'Float' THEN
                        field_obj := field_obj
                            || jsonb_strip_nulls(jsonb_build_object(
                                'min',    input_val #> '{data,min}',
                                'max',    input_val #> '{data,max}',
                                'step',   input_val #> '{data,step}',
                                'slider', input_val #> '{data,slider}'
                            ));
                    WHEN 'String' THEN
                        field_obj := field_obj
                            || jsonb_build_object(
                                'multiline', COALESCE((input_val #>> '{data,multiline}')::boolean, false)
                            );
                    WHEN 'MultiOption' THEN
                        field_obj := field_obj
                            || jsonb_build_object(
                                'options', COALESCE(input_val #> '{data,options}', '[]'::jsonb),
                                'kind',    COALESCE(input_val #>> '{data,variant}', 'select')
                            );
                    WHEN 'File' THEN
                        field_obj := field_obj
                            || jsonb_strip_nulls(jsonb_build_object(
                                'fileTypes', input_val #> '{data,fileTypes}'
                            ));
                    ELSE
                        NULL;
                END CASE;

                new_fields := new_fields || jsonb_build_array(field_obj);
            END IF;
        END LOOP;
    END IF;

    -- ── CONVERT OUTPUTS → outputs[] ──
    IF old_outputs IS NOT NULL AND jsonb_typeof(old_outputs) = 'object' THEN
        FOR output_id, output_val IN SELECT * FROM jsonb_each(old_outputs)
        LOOP
            port_variant := COALESCE(
                output_val #>> '{langChainDataTypes,0}',
                output_val #>> '{handleVariants,0}',
                'Message'
            );

            out_obj := jsonb_build_object(
                'id',          output_id,
                'variant',     port_variant,
                'displayName', COALESCE(output_val #>> '{uiData,displayName}', output_id)
            );

            new_outputs := new_outputs || jsonb_build_array(out_obj);
        END LOOP;
    END IF;

    -- ── BUILD NEW NODE ──
    RETURN jsonb_build_object(
        'id',           node_val ->> 'id',
        'blueprintId',  node_val ->> 'blueprintId',
        'displayName',  COALESCE(node_val ->> 'display_name', node_val ->> 'displayName', ''),
        'fields',       new_fields,
        'inputs',       new_inputs,
        'outputs',      new_outputs,
        'icon',         old_ui ->> 'icon',
        'description',  old_ui ->> 'description',
        'isMinimized',  COALESCE((old_ui ->> 'isMinimized')::boolean, false)
    );
END $$;


-- ============================================================
-- 4. Migrate a single workflow's data blob
-- ============================================================
CREATE OR REPLACE FUNCTION migrate_workflow_data(old_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
    result        jsonb;
    new_nodes     jsonb := '{}'::jsonb;
    new_edges     jsonb := '{}'::jsonb;
    new_static    jsonb;

    node_id       text;
    node_val      jsonb;
    edge_id       text;
    edge_val      jsonb;
BEGIN
    -- ── NODES ──
    IF old_data ? 'nodes' AND jsonb_typeof(old_data -> 'nodes') = 'object' THEN
        FOR node_id, node_val IN SELECT * FROM jsonb_each(old_data -> 'nodes')
        LOOP
            new_nodes := new_nodes || jsonb_build_object(node_id, migrate_node(node_val));
        END LOOP;
    END IF;

    -- ── EDGES ──
    IF old_data ? 'edges' AND jsonb_typeof(old_data -> 'edges') = 'object' THEN
        FOR edge_id, edge_val IN SELECT * FROM jsonb_each(old_data -> 'edges')
        LOOP
            new_edges := new_edges || jsonb_build_object(edge_id, migrate_edge(edge_val));
        END LOOP;
    END IF;

    -- ── STATIC VALUES (rename fieldValues → staticValues) ──
    new_static := COALESCE(old_data -> 'fieldValues', '{}'::jsonb);

    -- Build final data object
    result := jsonb_build_object(
        'nodes',        new_nodes,
        'edges',        new_edges,
        'staticValues', new_static,
        'ui',           COALESCE(old_data -> 'ui', '{}'::jsonb)
    );

    RETURN result;
END $$;


-- ============================================================
-- 5. RUN THE MIGRATION
-- ============================================================
DO $$
DECLARE
    wf_record RECORD;
    new_data  jsonb;
BEGIN
    FOR wf_record IN SELECT id, data FROM public.workflows WHERE id = 'd18a769e-d78d-4359-ade0-c62b699f57d9'
    LOOP
        new_data := migrate_workflow_data(wf_record.data);

        UPDATE public.workflows
        SET data = new_data
        WHERE id = wf_record.id;
    END LOOP;
END $$;
