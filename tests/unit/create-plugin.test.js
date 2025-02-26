/*
 * Copyright 2021 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'
const tap = require('tap')
const createPlugin = require('../../lib/create-plugin')
const sinon = require('sinon')

tap.test('createPlugin edge cases', (t) => {
  t.autoend()
  let operationSegment
  let instrumentationApi

  t.beforeEach(function () {
    operationSegment = {
      start: sinon.stub(),
      addAttribute: sinon.stub(),
      transaction: { nameState: { setName: sinon.stub() } },
      end: sinon.stub()
    }

    instrumentationApi = {
      logger: {
        child: sinon
          .stub()
          .returns({ info: sinon.stub(), debug: sinon.stub(), trace: sinon.stub() })
      },
      agent: {
        metrics: {
          getOrCreateMetric: sinon.stub().returns({ incrementCallCount: sinon.stub() })
        }
      },
      getActiveSegment: sinon.stub().returns({}),
      createSegment: sinon.stub().callsFake((name) => {
        operationSegment.name = name
        return operationSegment
      }),
      setActiveSegment: sinon.stub()
    }
  })

  t.test('should set deepest path to empty when not present', (t) => {
    const responseContext = {
      document: {
        definitions: [
          {
            kind: 'OperationDefinition',
            selectionSet: {
              selections: []
            }
          }
        ]
      }
    }

    const hooks = createPlugin(instrumentationApi)
    const operationHooks = hooks.requestDidStart({})
    operationHooks.willSendResponse(responseContext)
    t.equal(
      operationSegment.name,
      'GraphQL/operation/ApolloServer/undefined/<anonymous>',
      'should set path to undefined'
    )
    t.end()
  })

  t.test('should not update operation name when document is null', (t) => {
    const responseContext = {}
    const hooks = createPlugin(instrumentationApi)
    const operationHooks = hooks.requestDidStart({})
    t.equal(
      operationSegment.name,
      'GraphQL/operation/ApolloServer/<unknown>',
      'should default operation name'
    )
    operationHooks.willSendResponse(responseContext)
    t.equal(
      operationSegment.name,
      'GraphQL/operation/ApolloServer/<unknown>',
      'should not update operation name'
    )
    t.end()
  })

  t.test('should not crash when ctx.operation is undefined in didResolveOperation', (t) => {
    const hooks = createPlugin(instrumentationApi)
    const operationHooks = hooks.requestDidStart({})
    t.doesNotThrow(() => {
      operationHooks.didResolveOperation({})
    })
    t.end()
  })
})
