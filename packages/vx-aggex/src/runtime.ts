import { CompiledStateGraph, LangGraphRunnableConfig, MessagesValue, ReducedValue, StateSchema, UntrackedValue } from "@langchain/langgraph";
import { Foundations, Orchestrator } from "@vx-agent-editor/shared/domain";
import { Workflow } from "@vx-agent-editor/shared/domain";
import { EventBuilder } from "./eventBuilder";
import { LC } from "./langchain";
import { InferFields, InferFieldsWithInitial, InferInputs, InferOutputs } from "./types";
import { StreamController } from "./StreamController";



export namespace Runtime {

    export type Emitter = (
        callbackFn: (eventBuilder: EventBuilder) => Orchestrator.Event
    ) => void



    export namespace State {
        export const Schema = new StateSchema({
            node_outputs: new ReducedValue(
                Orchestrator.SerializableState.Schema.shape.node_outputs,
                {
                    reducer: (x, y) => ({ ...x, ...y }),
                }
            ),
            messages: MessagesValue,
            artifacts: new ReducedValue(
                Orchestrator.SerializableState.Schema.shape.artifacts,
                {
                    reducer: (x, y) => ({ ...x, ...y }),
                }
            ),
            metadata: new ReducedValue(
                Orchestrator.SerializableState.Schema.shape.metadata,
                {
                    reducer: (x, y) => ({ ...x, ...y }),
                }
            ),
            node_messages: new ReducedValue(
                Orchestrator.SerializableState.Schema.shape.node_messages,
                {
                    reducer: (x, y) => ({ ...x, ...y }),
                }
            ),
            streamController: new UntrackedValue<StreamController>()
        });
        export const Update = State.Schema.Update
        export type Update = typeof Update
    }
    export type State = typeof State.Schema.State



    export type CompiledGraph = CompiledStateGraph<
        State,
        typeof State.Schema.Update,
        string,
        typeof State.Schema,
        typeof State.Schema
    >

    export type NodeRunner = (
        state: Runtime.State,
        activeNode: Workflow.Node,
        Vertex: Runtime.Node<Foundations.Blueprint>,
        workflow: Workflow,
        workflowCache: Workflow.Cache,
        emit: Runtime.Emitter
    ) => Promise<State.Update>

    export namespace Node {
        export interface ConstructorProps {
            state: Runtime.State;
            workflowNode: Workflow.Node;
            workflow: Workflow;
            workflowCache: Workflow.Cache;
        }
    }

    export abstract class Node<T_Blueprint extends Foundations.Blueprint> {

        public workflowNode: Workflow.Node;

        constructor(props: Node.ConstructorProps) {
            this.workflowNode = props.workflowNode;

            this.fields = Node.resolveFields<T_Blueprint>(this.workflowNode.id, props.workflow)
        }

        public fields: InferFields<T_Blueprint>


        /**
         * Execute this node.
         * 
         * @param globalState - The full LangGraph runtime state
         * @param config - Static configuration values (NodeConfig fields like temperature, model, etc.)
         * @param inputs - Port inputs resolved from upstream edges or fallback values
         */
        public abstract run(
            globalState: Runtime.State,
            inputs: InferInputs<T_Blueprint>
        ): Promise<InferOutputs<T_Blueprint>>;

        protected async onConversion(
            currentBlueprint: T_Blueprint
        ): Promise<T_Blueprint> {
            return currentBlueprint
        }

        public static resolveInitialFieldValues<T_Blueprint extends Foundations.Blueprint>(
            blueprint: T_Blueprint,
            fields: Record<Foundations.Field.Id, Foundations.Field.Value>
        ): InferFieldsWithInitial<T_Blueprint> {

            const resolved: Record<Foundations.Field.Id, Foundations.Field.Value> = {}

            for (const field of blueprint.fields) {
                resolved[field.id] = field.initialValue as Foundations.Field.Value;
            }

            for (const [fieldId, fieldValue] of Object.entries(fields)) {
                resolved[fieldId as Foundations.Field.Id] = fieldValue;
            }

            return resolved as InferFieldsWithInitial<T_Blueprint>
        }

        // Checks if a field has static values
        // And if not, it uses the initialValue
        private static resolveFields<T_Blueprint extends Foundations.Blueprint>(
            nodeId: Workflow.Node.Id,
            workflow: Workflow
        ): InferFields<T_Blueprint> {
            const node = workflow.data.nodes[nodeId];
            const staticValues = workflow.data.staticValues[nodeId] ?? {};

            const resolved: Record<Foundations.Field.Id, Foundations.Field.Value> = {};

            for (const field of node.fields) {
                const fieldId = field.id as Foundations.Field.Id;

                if (fieldId in staticValues)
                    resolved[fieldId] = staticValues[fieldId] as Foundations.Field.Value;
                else
                    resolved[fieldId] = field.initialValue as Foundations.Field.Value;
            }

            return resolved as InferFields<T_Blueprint>
        }
    }

}
