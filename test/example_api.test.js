// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: oasgraph
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict'

/* globals beforeAll, test, expect */

/**
 * Precondition: run `node test/example_api_server.js`
 */

const OasGraph = require('../lib/index.js')
const {
  graphql,
  parse,
  validate
} = require('graphql')

/**
 * Set up the schema first
 */
let createdSchema
let oas = require('./fixtures/example_oas.json')
beforeAll(() => {
  return OasGraph.createGraphQlSchema(oas, {
    addSubOperations: true
  })
    .then(({schema, report}) => {
      createdSchema = schema
    })
})

test('Get resource (incl. enum)', () => {
  let query = `{
    user (username: "arlene") {
      name
      status
    }
  }`
  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({data: {user: {name: 'Arlene L McMahon', status: 'staff'}}})
  })
})

test('Get resource 2', () => {
  let query = `{
    company (id: "binsol") {
      legalForm
    }
  }`
  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({data: {company: {legalForm: 'public'}}})
  })
})

test('Get resource with status code: 2XX', () => {
  let query = `{
    papers {
      name
      published
    }
  }`
  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({data: {papers: [{name: "Deliciousness of apples", published: true}, {name: "How much coffee is too much coffee?", published: false}, {name: "How many tennis balls can fit into the average building?", published: true}]}})
  })
})

test('Get nested resource via link $response.body#/...', () => {
  let query = `{
    user (username: "arlene") {
      name
      employerCompany {
        legalForm
      }
    }
  }`
  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        user: {
          name: 'Arlene L McMahon',
          employerCompany: {
            legalForm: 'public'
          }
        }
      }
    })
  })
})

test('Get nested resource via link $request.path#/... and $request.query#/', () => {
  let query = `{
    productWithId (productId: "123" productTag: "blah") {
      productName
      reviews {
        text
      }
    }
  }`
  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        'productWithId': {
          'productName': 'Super Product',
          'reviews': [
            {text: 'Great product'},
            {text: 'I love it'}
          ]
        }
      }
    })
  })
})

test('Get nested resource via link operationRef', () => {
  let query = `{
    productWithId (productId: "123" productTag: "blah") {
      productName
      reviewsWithOperationRef {
        text
      }
    }
  }`
  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        'productWithId': {
          'productName': 'Super Product',
          'reviewsWithOperationRef': [
            {text: 'Great product'},
            {text: 'I love it'}
          ]
        }
      }
    })
  })
})

test('Get response without providing parameter with default value', () => {
  let query = `{
    productsReviews (id: "100") {
      text
    }
  }`
  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        'productsReviews': [
          {text: 'Great product'},
          {text: 'I love it'}
        ]
      }
    })
  })
})

test('Get response containing 64 bit integer (using GraphQLFloat)', () => {
  let query = `{
    productsReviews (id: "100") {
      timestamp
    }
  }`
  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        'productsReviews': [
          {timestamp: 1502787600000000},
          {timestamp: 1502787400000000}
        ]
      }
    })
  })
})

test('Get array of strings', () => {
  let query = `{
    user (username: "arlene") {
      hobbies
    }
  }`
  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        user: {
          hobbies: ['tap dancing', 'bowling']
        }
      }
    })
  })
})

test('Get array of objects', () => {
  let query = `{
    company (id: "binsol") {
      offices{
        street
      }
    }
  }`
  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        company: {
          offices: [{
            street: '122 Elk Rd Little'
          },
          {
            street: '124 Elk Rd Little'
          }]
        }
      }
    })
  })
})

test('Get single resource', () => {
  let query = `{
    user(username: "arlene"){
      name
      address{
        street
      }
    }
  }`
  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        user: {
          name: 'Arlene L McMahon',
          address: {
            street: '4656 Cherry Camp Road'
          }
        }
      }
    })
  })
})

test('Post resource', () => {
  let query = `mutation {
    postUser (userInput: {
      name: "Mr. New Guy"
      address: {
        street: "Home streeet 1"
        city: "Hamburg"
      }
      employerId: "binsol"
      hobbies: "soccer"
    }) {
      name
    }
  }`
  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        postUser: {
          name: 'Mr. New Guy'
        }
      }
    })
  })
})

test('Post resource and get nested resource back', () => {
  let query = `mutation {
    postUser (userInput: {
      name: "Mr. New Guy"
      address: {
        street: "Home streeet 1"
        city: "Hamburg"
      }
      employerId: "binsol"
      hobbies: "soccer"
    }) {
      name
      employerCompany {
        ceoUser {
          name
        }
      }
    }
  }`
  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        postUser: {
          name: 'Mr. New Guy',
          employerCompany: {
            ceoUser: {
              name: 'John C Barnes'
            }
          }
        }
      }
    })
  })
})

test('Post resource with non-application/json content-type request and response bodies', () => {
  let query = `mutation{postPaper(textPlainInput: "happy")}`
  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        postPaper: "You sent the paper idea: \"happy\""
      }
    })
  })
})

test('Operation id is correctly sanitized, schema names and fields are ' +
  'correctly sanitized, path and query parameters are correctly sanitized, ' +
  'received data is correctly sanitized', () => {
  let query = `{
    productWithId (productId: "this-path", productTag:"And a tag") {
      productId
      productTag
    }
  }`
  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        productWithId: {
          productId: 'this-path',
          productTag: 'And a tag'
        }
      }
    })
  })
})

test('Request data is correctly de-sanitized to be sent', () => {
  let query = `mutation {
    postProductWithId (productWithIdInput: {
      productName: "Soccer ball"
      productId: "ball123"
      productTag:"sports"
    }) {
      productName
      productId
      productTag
    }
  }`
  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      'data': {
        'postProductWithId': {
          'productName': 'Soccer ball',
          'productId': 'ball123',
          'productTag': 'sports'
        }
      }
    })
  })
})

test('Sub operations are properly made available', () => {
  let query = `{
    user (username: "arlene") {
      name
      car {
        color
        model
      }
    }
  }`
  return graphql(createdSchema, query, null, {}).then(result => {
    expect(result).toEqual({
      data: {
        user: {
          name: 'Arlene L McMahon',
          car: {
            color: 'black',
            model: 'BMW 7 series'
          }
        }
      }
    })
  })
})

test('Fields with arbitrary JSON (e.g., maps) can be returned', () => {
  let query = `{
    user (username: "arlene") {
      name
      car {
        color
        model
        tags
      }
    }
  }`
  return graphql(createdSchema, query, null, {}).then(result => {
    expect(result).toEqual({
      data: {
        user: {
          name: 'Arlene L McMahon',
          car: {
            color: 'black',
            model: 'BMW 7 series',
            tags: {
              impression: 'decadent'
            }
          }
        }
      }
    })
  })
})

test('Capitalized enum values can be returned', () => {
  let query = `{
    user (username: "arlene") {
      name
      car {
        kind
      }
    }
  }`
  return graphql(createdSchema, query, null, {}).then(result => {
    expect(result).toEqual({
      data: {
        user: {
          name: 'Arlene L McMahon',
          car: {
            kind: 'LIMOSINE'
          }
        }
      }
    })
  })
})

test('Define header and query options', () => {
  let options = {
    headers: {
      exampleHeader: 'some-value'
    },
    qs: {
      limit: 30
    }
  }
  let query = `{
    status (globalquery: "test")
  }`
  return OasGraph.createGraphQlSchema(oas, options)
    .then(({schema}) => {
      // validate that 'limit' parameter is covered by options:
      let ast = parse(query)
      let errors = validate(schema, ast)
      expect(errors).toEqual([])
      return graphql(schema, query).then(result => {
        expect(result).toEqual({
          data: {
            status: 'Ok.'
          }
        })
      })
    })
})

test('Resolve allOf', () => {
  let query = `{
    user (username: "arlene") {
      name
      nomenclature {
        suborder
        family
        genus
        species
      }
    }
  }`
  return graphql(createdSchema, query, null, {}).then(result => {
    expect(result).toEqual({
      data: {
        user: {
          name: 'Arlene L McMahon',
          nomenclature: {
            suborder: 'Haplorhini',
            family: 'Hominidae',
            genus: 'Homo',
            species: 'sapiens'
          }
        }
      }
    })
  })
})
