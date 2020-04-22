import { expect } from 'chai'
import { UserResource } from '..'
import { ValidationError as ValidationErrorOriginal } from '../../src/exceptions'

describe('Validation', () => {
    const badPhoneNumber = '0118 999 88199 9119 725... 3'
    const goodPhoneNumber = '4155551234'
    const badString = 'Th(s*s3'
    const goodString = 'abc123'

    function phoneValidator(value: string, instance: any, ValidationError: any) {
        let regExp = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im
        if (!regExp.test(value)) {
            throw new ValidationError('phone', 'Phone number is invalid')
        }
    }

    function isAlphaNumeric(value: string, instance: any, ValidationError: any) {
        let regExp = /^[a-z0-9]+$/i
        if (!regExp.test(value)) {
            throw new ValidationError('', 'This field must be alphanumeric')
        }
    }

    const CustomUserResource = UserResource.extend({
        _cache: {},
        validation: {
            phone: [phoneValidator, isAlphaNumeric],
            username: isAlphaNumeric
        },
    })

    const CustomUserResourceDefinedWithFunction = UserResource.extend({
        _cache: {},
        validation() {
            return {
                phone: phoneValidator,
            }
        },
    })

    let failsPhoneValidation = new CustomUserResource({ phone: badPhoneNumber })
    let passesPhoneValidation = new CustomUserResource({ phone: goodPhoneNumber })
    let failsStringValidation = new CustomUserResource({ username: badString })
    let typicalResource = new CustomUserResource({ phone: goodPhoneNumber, username: goodString })

    it('validators initialize correctly', async () => {
        let phoneErrors = failsPhoneValidation.validate()
        let stringErrors = failsStringValidation.validate()
        expect(phoneErrors.length).to.equal(2)
        expect(stringErrors.length).to.equal(2)
        expect(passesPhoneValidation.validate()).to.be.empty
        expect(typicalResource.validate()).to.be.empty
    })

    it('validators can be set with a function', async () => {
        let badResource = new CustomUserResourceDefinedWithFunction({ phone: badPhoneNumber })
        let errors = badResource.validate()
        expect(errors.length).to.equal(1)
        expect(errors[0].message).to.contain('Phone number is invalid')
    })

    it('raises exceptions', async () => {
        let phoneErrors = failsPhoneValidation.validate()
        phoneErrors.forEach((e) => {
            expect(ValidationErrorOriginal.isInstance(e)).to.be.true
        })
    })
})
