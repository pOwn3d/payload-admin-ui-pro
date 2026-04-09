import { describe, it, expect } from 'vitest'
import {
  validateUrl,
  validateBackground,
  validateTextField,
  containsDangerousCSS,
} from '../utils/security.js'

describe('validateUrl', () => {
  it('accepts relative URLs', () => {
    expect(validateUrl('/admin')).toBe(true)
    expect(validateUrl('/media/image.png')).toBe(true)
  })

  it('accepts HTTPS URLs', () => {
    expect(validateUrl('https://example.com/logo.png')).toBe(true)
  })

  it('accepts data:image URIs', () => {
    expect(validateUrl('data:image/png;base64,abc123')).toBe(true)
  })

  it('rejects HTTP URLs', () => {
    expect(validateUrl('http://example.com')).not.toBe(true)
  })

  it('rejects javascript: protocol', () => {
    expect(validateUrl('javascript:alert(1)')).not.toBe(true)
  })

  it('rejects data: non-image URIs', () => {
    expect(validateUrl('data:text/html,<script>alert(1)</script>')).not.toBe(true)
  })

  it('rejects protocol-relative URLs', () => {
    expect(validateUrl('//evil.com/script.js')).not.toBe(true)
  })

  it('accepts empty string', () => {
    expect(validateUrl('')).toBe(true)
  })

  it('rejects URLs exceeding max length', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(3000)
    expect(validateUrl(longUrl)).not.toBe(true)
  })
})

describe('validateBackground', () => {
  it('accepts CSS gradients', () => {
    expect(validateBackground('linear-gradient(135deg, #667eea 0%, #764ba2 100%)')).toBe(true)
    expect(validateBackground('radial-gradient(circle, red, blue)')).toBe(true)
    expect(validateBackground('conic-gradient(from 45deg, red, blue)')).toBe(true)
  })

  it('accepts URLs', () => {
    expect(validateBackground('/images/bg.jpg')).toBe(true)
    expect(validateBackground('https://example.com/bg.webp')).toBe(true)
  })

  it('rejects dangerous patterns inside gradients', () => {
    expect(validateBackground('linear-gradient(135deg, url(evil.js), red)')).not.toBe(true)
  })

  it('rejects random strings', () => {
    expect(validateBackground('not a gradient or url')).not.toBe(true)
  })

  it('accepts empty string', () => {
    expect(validateBackground('')).toBe(true)
  })
})

describe('validateTextField', () => {
  it('accepts normal text', () => {
    expect(validateTextField('Hello world')).toBe(true)
  })

  it('rejects HTML tags', () => {
    expect(validateTextField('<script>alert(1)</script>')).not.toBe(true)
    expect(validateTextField('Hello <b>world</b>')).not.toBe(true)
  })

  it('rejects text exceeding max length', () => {
    expect(validateTextField('a'.repeat(600))).not.toBe(true)
    expect(validateTextField('a'.repeat(600), 1000)).toBe(true)
  })

  it('accepts empty/null', () => {
    expect(validateTextField('')).toBe(true)
  })
})

describe('containsDangerousCSS', () => {
  it('detects @import', () => {
    expect(containsDangerousCSS('@import url("evil.css")')).toBe(true)
  })

  it('detects url()', () => {
    expect(containsDangerousCSS('background: url(evil.js)')).toBe(true)
  })

  it('detects expression()', () => {
    expect(containsDangerousCSS('width: expression(alert(1))')).toBe(true)
  })

  it('detects javascript:', () => {
    expect(containsDangerousCSS('background: javascript:alert(1)')).toBe(true)
  })

  it('detects </style tag', () => {
    expect(containsDangerousCSS('</style><script>alert(1)</script>')).toBe(true)
  })

  it('detects <script tag', () => {
    expect(containsDangerousCSS('<script>alert(1)</script>')).toBe(true)
  })

  it('allows safe CSS', () => {
    expect(containsDangerousCSS('color: red; font-size: 16px;')).toBe(false)
    expect(containsDangerousCSS(':root { --my-color: #333; }')).toBe(false)
  })
})
