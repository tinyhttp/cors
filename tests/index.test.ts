import { suite } from 'uvu'
import * as assert from 'assert'
import { makeFetch } from 'supertest-fetch'
import { cors } from '../src/index'
import * as http from 'http'

function describe(name: string, fn: (...args: any[]) => void) {
  const s = suite(name)
  fn(s)
  s.run()
}

const createServer = (h: (req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => void) => {
  return http.createServer((req, res) => {
    h(req, res, () => {
      res.end('')
    })
  })
}

describe('CORS headers tests', (it) => {
  it('should set origin to "*" if origin=true', async () => {
    const app = createServer(cors({ origin: true }))

    const fetch = makeFetch(app)

    await fetch('/').expect('Access-Control-Allow-Origin', '*')
  })
  it('should set origin if it is a string', async () => {
    const app = createServer(cors({ origin: 'example.com' }))

    const fetch = makeFetch(app)

    await fetch('/').expect('Access-Control-Allow-Origin', 'example.com')
  })
  it('should set origin if it is a function', async () => {
    const app = createServer(cors({ origin: () => 'example.com' }))

    const fetch = makeFetch(app)

    await fetch('/').expect('Access-Control-Allow-Origin', 'example.com')
  })
  it('should set origin if it is a regex', async () => {
    const app = createServer((req, res) => cors({ origin: /(?:http:\/\/)?example.com/ })(req, res, () => res.end()))

    const fetch = makeFetch(app)

    await fetch('/', { headers: { Origin: 'http://example.com' } }).expect(
      'Access-Control-Allow-Origin',
      'http://example.com'
    )
  })
  describe('when origin is an array of strings', (it) => {
    it('should set origin when origin header is included in request and whitelisted', async () => {
      const app = createServer(cors({ origin: ['http://example.com', 'example.com', 'https://example.com'] }))

      const fetch = makeFetch(app)

      await fetch('/', { headers: { Origin: 'http://example.com' } }).expect(
        'Access-Control-Allow-Origin',
        'http://example.com'
      )
    })
    it('should not set origin when origin header is included in request but not whitelisted', async () => {
      const app = createServer(cors({ origin: ['http://example.com', 'example.com', 'https://example.com'] }))

      const fetch = makeFetch(app)

      await fetch('/', { headers: { Origin: 'http://not-example.com' } }).expect('Access-Control-Allow-Origin', null)
    })
    it('should not set origin when origin header is excluded from request', async () => {
      const app = createServer(cors({ origin: ['http://example.com', 'example.com', 'https://example.com'] }))

      const fetch = makeFetch(app)

      await fetch('/').expect('Access-Control-Allow-Origin', null)
    })
  })
  it('should send an error if origin is an iterable containing a non-string', async () => {
    try {
      // @ts-ignore
      const middleware = cors({ origin: [{}, 3, 'abc'] })
    } catch (e) {
      assert.strictEqual(e.message, 'No other objects allowed. Allowed types is array of strings or RegExp')
    }
  })
  it('should send an error if it is other object types', () => {
    try {
      // @ts-ignore
      const middleware = cors({ origin: { site: 'http://example.com' } })
    } catch (e) {
      assert.strictEqual(e.message, 'No other objects allowed. Allowed types is array of strings or RegExp')
    }
  })
  it('should set custom methods', async () => {
    const app = createServer(cors({ methods: ['GET'] }))

    const fetch = makeFetch(app)

    await fetch('/').expect('Access-Control-Allow-Methods', 'GET')
  })
  it('should set custom max-age', async () => {
    const app = createServer(cors({ maxAge: 86400 }))

    const fetch = makeFetch(app)

    await fetch('/').expect('Access-Control-Max-Age', '86400')
  })
  it('should set custom credentials', async () => {
    const app = createServer(cors({ credentials: true }))

    const fetch = makeFetch(app)

    await fetch('/').expect('Access-Control-Allow-Credentials', 'true')
  })
  it('should set custom exposed headers', async () => {
    const app = createServer(cors({ exposedHeaders: ['Content-Range', 'X-Content-Range'] }))

    const fetch = makeFetch(app)

    await fetch('/').expect('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range')
  })
  it('should set custom allowed headers', async () => {
    const app = createServer(cors({ allowedHeaders: ['Content-Range', 'X-Content-Range'] }))

    const fetch = makeFetch(app)

    await fetch('/').expect('Access-Control-Allow-Headers', 'Content-Range, X-Content-Range')
  })
  it('should send 204 and continue the request', async () => {
    const app = createServer((req, res) => {
      cors({
        preflightContinue: false
      })(req, res)
    })

    const fetch = makeFetch(app)

    await fetch('/', { method: 'OPTIONS' }).expectStatus(204)
  })
  it('should send 200 and continue the request', async () => {
    const app = http.createServer((req, res) => {
      cors({
        preflightContinue: true
      })(req, res)
      res.end('something more')
    })

    const fetch = makeFetch(app)

    await fetch('/', { method: 'OPTIONS' }).expect(200, 'something more')
  })
  it('should send 200 and continue the request', async () => {
    const app = http.createServer((req, res) => {
      cors({
        preflightContinue: true
      })(req, res)

      res.end('something else?')
    })

    const fetch = makeFetch(app)

    await fetch('/').expect(200, 'something else?')
  })
  it('should send 200 and continue the request', async () => {
    const app = http.createServer((req, res) => {
      cors()(req, res)

      res.end('something else?')
    })

    const fetch = makeFetch(app)

    await fetch('/').expectHeader('Access-Control-Allow-Origin', '*').expect(200, 'something else?')
  })
})
