"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkProxy = void 0;
var NetworkProxy;
(function (NetworkProxy) {
    /** The universal proxy credential — declared on no blueprint, attachable to any node.
     *  Defined in nodes/src/Credentials/NetworkProxy.ts; this is the key it occupies in
     *  `Workflow.Data.credentialInstanceIds[nodeId]`. */
    NetworkProxy.TEMPLATE_ID = "networkProxy";
    // encodeURIComponent because provider passwords routinely contain : @ / #.
    NetworkProxy.toUrl = ({ protocol, host, port, username, password }) => {
        const auth = username
            ? `${encodeURIComponent(username)}:${encodeURIComponent(password ?? "")}@`
            : "";
        return `${protocol}://${auth}${host}:${port}`;
    };
})(NetworkProxy || (exports.NetworkProxy = NetworkProxy = {}));
