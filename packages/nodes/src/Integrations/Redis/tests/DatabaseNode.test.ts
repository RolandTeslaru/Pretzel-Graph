import "reflect-metadata"

import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"

import {
    CatalogueService,
    StandardFields,
    toRedisCreds,
} from "@pretzel-graph/node-sdk"
import { Foundations } from "@pretzel-graph/shared/domain"

import { Blueprint } from "../Database/blueprint"


const routes = [
    { name: "string.get",       values: { resource: "string", stringOperation: "GET"       }, fields: [] },
    { name: "string.set",       values: { resource: "string", stringOperation: "SET"       }, fields: ["stringValue", "stringTtl"] },
    { name: "string.increment", values: { resource: "string", stringOperation: "INCREMENT" }, fields: ["incrementAmount"] },
    { name: "string.decrement", values: { resource: "string", stringOperation: "DECREMENT" }, fields: ["decrementAmount"] },
    { name: "key.exists",       values: { resource: "key",    keyOperation: "EXISTS"        }, fields: [] },
    { name: "key.delete",       values: { resource: "key",    keyOperation: "DELETE"        }, fields: [] },
    { name: "key.expire",       values: { resource: "key",    keyOperation: "EXPIRE"        }, fields: ["expirySeconds"] },
    { name: "key.ttl",          values: { resource: "key",    keyOperation: "TTL"           }, fields: [] },
    { name: "hash.get",         values: { resource: "hash",   hashOperation: "HGET"          }, fields: ["hashGetField"] },
    { name: "hash.set",         values: { resource: "hash",   hashOperation: "HSET"          }, fields: ["hashSetField", "hashSetValue"] },
    { name: "hash.getAll",      values: { resource: "hash",   hashOperation: "HGETALL"       }, fields: [] },
    { name: "hash.delete",      values: { resource: "hash",   hashOperation: "HDELETE"       }, fields: ["hashDeleteField"] },
] as const

const nodesRoot = fileURLToPath(new URL("../../..", import.meta.url))


describe("Redis Database derivatives", () => {

    it("derives one focused valid blueprint for every operation", () => {
        for (const route of routes) {
            const { blueprint, derivativeId } = Foundations.Blueprint.derive(Blueprint, route.values as never)
            const ownFieldIds = blueprint.fields
                .filter(field => !StandardFields.IDS.has(String(field.id)))
                .map(field => String(field.id))

            assert.equal(derivativeId, Object.entries(route.values).map(([key, value]) => `${key}==${value}`).join("/"), route.name)
            assert.deepEqual(ownFieldIds, ["resource", "key", ...Object.keys(route.values).slice(1), ...route.fields], route.name)
            assert.deepEqual(blueprint.outputs.map(output => output.id), ["result"], route.name)
            assert.equal(Foundations.Blueprint.Schema.safeParse(blueprint).success, true, route.name)
            assert.equal(new Set(ownFieldIds).size, ownFieldIds.length, route.name)
            assert.equal("_derivatives" in blueprint, false, route.name)
        }
    })

    it("defaults to String Get", () => {
        const { blueprint, derivativeId } = Foundations.Blueprint.derive(Blueprint, {})

        assert.equal(derivativeId, "resource==string/stringOperation==GET")
        assert.deepEqual(
            blueprint.fields
                .filter(field => !StandardFields.IDS.has(String(field.id)))
                .map(field => String(field.id)),
            ["resource", "key", "stringOperation"],
        )
    })

    it("resolves its inline derivative through the catalogue", async () => {
        CatalogueService.setNodesRoot(nodesRoot)

        const result = await CatalogueService.resolveBlueprint(
            Blueprint.id,
            { resource: "hash", hashOperation: "HSET" } as never,
        )

        assert.equal(result?.fields.some(field => String(field.id) === "hashSetValue"), true)
        assert.equal(result?.fields.some(field => String(field.id) === "stringValue"), false)
    })

    it("maps hosted Redis ACL and TLS credentials", () => {
        assert.deepEqual(
            toRedisCreds({
                host: "example.redis.io",
                port: 16379,
                username: "default",
                password: "secret",
                db: 2,
                tls: true,
            }),
            {
                host: "example.redis.io",
                port: 16379,
                username: "default",
                password: "secret",
                db: 2,
                tls: true,
            },
        )
    })
})
