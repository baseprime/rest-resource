import { expect } from 'chai'
import { UserResource } from '..'
import { BaseNormalizer, NumberNormalizer, CurrencyNormalizer, BooleanNormalizer } from '../../src/helpers/normalization'

describe('Normalization', () => {

    class CustomUserResource extends UserResource {
        static normalization = {
            followers: new NumberNormalizer()
        }
    }

    it('normalizers work with Resources', async () => {
        let resource = new CustomUserResource({
            followers: '5' // Normalizes to a number
        })

        expect(typeof resource.attributes.followers).to.equal('number')
        resource.attributes.followers = '6'
        expect(typeof resource.attributes.followers).to.equal('number')
        expect(resource.changes.followers).to.equal(6)
    })

    it('base normalizer normalizes correctly', async () => {
        let normalizer = new BaseNormalizer()
        expect(normalizer.normalize(123)).to.equal('123')
        expect(normalizer.normalize({ id: 123 })).to.equal('123')
        expect(normalizer.normalize(false)).to.equal('')
        expect(normalizer.normalize(true)).to.equal('true')
        expect(normalizer.normalize(undefined)).to.equal(undefined)
        expect(normalizer.normalize(null)).to.equal(null)
    })

    it('non nullable normalizer normalizes undefined and null', async () => {
        let normalizer = new BaseNormalizer()
        normalizer.nullable = false
        expect(normalizer.normalize(undefined)).to.equal('')
        expect(normalizer.normalize(null)).to.equal('')
    })

    it('normalizer: numbers', async () => {
        let normalizer = new NumberNormalizer()
        expect(normalizer.normalize('123')).to.equal(123)
        expect(normalizer.normalize('-123')).to.equal(-123)
        expect(normalizer.normalize('-123.456')).to.equal(-123.456)
        expect(normalizer.normalize({ id: '123' })).to.equal(123)
        expect(normalizer.normalize(undefined)).to.equal(0)
        normalizer.nullable = true
        expect(normalizer.normalize(undefined)).to.equal(undefined)
    })

    it('normalizer: currency', async () => {
        let normalizer = new CurrencyNormalizer()
        expect(normalizer.normalize('123')).to.equal('123.00')
        expect(normalizer.normalize('123.4567')).to.equal('123.46')
        expect(normalizer.normalize(['123.4567', '000000'])).to.eql(['123.46', '0.00'])
        expect(normalizer.normalize('')).to.equal('0.00')
        expect(normalizer.normalize(null)).to.equal('0.00')
        expect(normalizer.normalize(undefined)).to.equal('0.00')
    })

    it('normalizer: boolean', async () => {
        let normalizer = new BooleanNormalizer()
        expect(normalizer.normalize('123')).to.equal(true)
        expect(normalizer.normalize([1, '1', 0, false, true])).to.eql([true, true, false, false, true])
        expect(normalizer.normalize(undefined)).to.equal(false)
        expect(normalizer.normalize(null)).to.equal(false)
    })

})
