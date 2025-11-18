"use strict";
// Progressive Disclosure Form Management System
// Handles form field visibility, validation, and completion tracking
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormDisclosureManager = exports.FORM_FIELD_CONFIGS = void 0;
exports.getFormSections = getFormSections;
var cider_1 = require("../types/cider");
// Field configuration for progressive disclosure
exports.FORM_FIELD_CONFIGS = {
    id: { key: 'id', label: 'ID', type: 'text', required: false, placeholder: '', section: 'core' },
    userId: { key: 'userId', label: 'User ID', type: 'text', required: false, placeholder: '', section: 'core' },
    // Core fields - always visible
    name: {
        key: 'name',
        label: 'Cider Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., Angry Orchard Crisp Apple',
        section: 'core',
        validationRules: [
            { type: 'required', message: 'Cider name is required' },
            { type: 'minLength', value: 2, message: 'Name must be at least 2 characters' },
            { type: 'maxLength', value: 100, message: 'Name must be less than 100 characters' }
        ]
    },
    brand: {
        key: 'brand',
        label: 'Brand',
        type: 'text',
        required: true,
        placeholder: 'e.g., Angry Orchard',
        section: 'core',
        validationRules: [
            { type: 'required', message: 'Brand is required' },
            { type: 'minLength', value: 2, message: 'Brand must be at least 2 characters' },
            { type: 'maxLength', value: 50, message: 'Brand must be less than 50 characters' }
        ]
    },
    abv: {
        key: 'abv',
        label: 'ABV (%)',
        type: 'number',
        required: true,
        placeholder: 'e.g., 5.0',
        section: 'core',
        validationRules: [
            { type: 'required', message: 'ABV is required' },
            { type: 'range', value: [0.1, 20], message: 'ABV must be between 0.1% and 20%' }
        ]
    },
    overallRating: {
        key: 'overallRating',
        label: 'Overall Rating',
        type: 'rating',
        required: true,
        placeholder: 'Rate from 1-10',
        section: 'core',
        validationRules: [
            { type: 'required', message: 'Rating is required' },
            { type: 'range', value: [1, 10], message: 'Rating must be between 1 and 10' }
        ]
    },
    // Optional core fields
    photo: {
        key: 'photo',
        label: 'Photo',
        type: 'text',
        required: false,
        placeholder: 'Take a photo',
        section: 'optional'
    },
    notes: {
        key: 'notes',
        label: 'Notes',
        type: 'text',
        required: false,
        placeholder: 'Your thoughts on this cider...',
        section: 'optional',
        validationRules: [
            { type: 'maxLength', value: 1000, message: 'Notes must be less than 1000 characters' }
        ]
    },
    // Enthusiast fields
    traditionalStyle: {
        key: 'traditionalStyle',
        label: 'Traditional Style',
        type: 'select',
        required: false,
        placeholder: 'Select style',
        section: 'enthusiast',
        options: [
            { label: 'Traditional English', value: 'traditional_english' },
            { label: 'Modern Craft', value: 'modern_craft' },
            { label: 'Heritage', value: 'heritage' },
            { label: 'International', value: 'international' },
            { label: 'Fruit Cider', value: 'fruit_cider' },
            { label: 'Perry', value: 'perry' },
            { label: 'Ice Cider', value: 'ice_cider' },
            { label: 'Other', value: 'other' }
        ]
    },
    basicCharacteristics: {
        key: 'basicCharacteristics',
        label: 'Basic Characteristics',
        type: 'characteristics',
        required: false,
        placeholder: 'Describe characteristics',
        section: 'enthusiast',
        subFields: {
            sweetness: {
                key: 'sweetness',
                label: 'Sweetness',
                type: 'select',
                required: false,
                placeholder: 'Select sweetness level',
                section: 'enthusiast',
                options: [
                    { label: 'Bone Dry', value: 'bone_dry' },
                    { label: 'Dry', value: 'dry' },
                    { label: 'Off-Dry', value: 'off_dry' },
                    { label: 'Medium', value: 'medium' },
                    { label: 'Sweet', value: 'sweet' }
                ]
            },
            carbonation: {
                key: 'carbonation',
                label: 'Carbonation',
                type: 'select',
                required: false,
                placeholder: 'Select carbonation level',
                section: 'enthusiast',
                options: [
                    { label: 'Still', value: 'still' },
                    { label: 'Light Sparkling', value: 'light_sparkling' },
                    { label: 'Sparkling', value: 'sparkling' },
                    { label: 'Highly Carbonated', value: 'highly_carbonated' }
                ]
            },
            clarity: {
                key: 'clarity',
                label: 'Clarity',
                type: 'select',
                required: false,
                placeholder: 'Select clarity',
                section: 'enthusiast',
                options: [
                    { label: 'Crystal Clear', value: 'crystal_clear' },
                    { label: 'Clear', value: 'clear' },
                    { label: 'Hazy', value: 'hazy' },
                    { label: 'Cloudy', value: 'cloudy' },
                    { label: 'Opaque', value: 'opaque' }
                ]
            }
        }
    },
    tasteTags: {
        key: 'tasteTags',
        label: 'Taste Tags',
        type: 'tags',
        required: false,
        placeholder: 'Add taste descriptors',
        section: 'enthusiast',
        validationRules: [
            { type: 'maxLength', value: 10, message: 'Maximum 10 taste tags allowed' }
        ]
    },
    containerType: {
        key: 'containerType',
        label: 'Container Type',
        type: 'select',
        required: false,
        placeholder: 'Select container',
        section: 'enthusiast',
        options: [
            { label: 'Bottle', value: 'bottle' },
            { label: 'Can', value: 'can' },
            { label: 'Bag-in-Box', value: 'bag_in_box' },
            { label: 'Draught', value: 'draught' },
            { label: 'Other', value: 'other' }
        ]
    },
    // Expert fields (simplified for implementation)
    appleClassification: {
        key: 'appleClassification',
        label: 'Apple Classification',
        type: 'multiselect',
        required: false,
        placeholder: 'Select apple categories',
        section: 'expert'
    },
    productionMethods: {
        key: 'productionMethods',
        label: 'Production Methods',
        type: 'multiselect',
        required: false,
        placeholder: 'Select production methods',
        section: 'expert'
    },
    detailedRatings: {
        key: 'detailedRatings',
        label: 'Detailed Ratings',
        type: 'characteristics',
        required: false,
        placeholder: 'Rate individual aspects',
        section: 'expert'
    },
    venue: {
        key: 'venue',
        label: 'Venue',
        type: 'text',
        required: false,
        placeholder: 'Where did you try this?',
        section: 'expert'
    },
    // System fields
    createdAt: { key: 'createdAt', label: 'Created', type: 'text', required: false, placeholder: '', section: 'core' },
    updatedAt: { key: 'updatedAt', label: 'Updated', type: 'text', required: false, placeholder: '', section: 'core' },
    syncStatus: { key: 'syncStatus', label: 'Sync Status', type: 'text', required: false, placeholder: '', section: 'core' },
    version: { key: 'version', label: 'Version', type: 'number', required: false, placeholder: '', section: 'core' }
};
// =============================================================================
// FORM STATE MANAGEMENT
// =============================================================================
var FormDisclosureManager = /** @class */ (function () {
    function FormDisclosureManager() {
    }
    /**
     * Get fields visible at the current disclosure level
     */
    FormDisclosureManager.getVisibleFields = function (level) {
        var config = cider_1.DISCLOSURE_CONFIGS[level];
        var allFields = __spreadArray(__spreadArray([], config.fields, true), config.optional, true);
        return allFields
            .map(function (fieldKey) { return exports.FORM_FIELD_CONFIGS[fieldKey]; })
            .filter(function (field) { return field !== undefined; });
    };
    /**
     * Get required fields for the current disclosure level
     */
    FormDisclosureManager.getRequiredFields = function (level) {
        var config = cider_1.DISCLOSURE_CONFIGS[level];
        return config.fields
            .map(function (fieldKey) { return exports.FORM_FIELD_CONFIGS[fieldKey]; })
            .filter(function (field) { return field !== undefined; });
    };
    /**
     * Check if a field should be visible at the current level
     */
    FormDisclosureManager.isFieldVisible = function (fieldKey, level) {
        var config = cider_1.DISCLOSURE_CONFIGS[level];
        return config.fields.includes(fieldKey) || config.optional.includes(fieldKey);
    };
    /**
     * Check if a field is required at the current level
     */
    FormDisclosureManager.isFieldRequired = function (fieldKey, level) {
        var _a;
        var config = cider_1.DISCLOSURE_CONFIGS[level];
        return config.fields.includes(fieldKey) &&
            ((_a = exports.FORM_FIELD_CONFIGS[fieldKey]) === null || _a === void 0 ? void 0 : _a.required) === true;
    };
    /**
     * Calculate form completeness
     */
    FormDisclosureManager.calculateFormCompleteness = function (formData, level, validationState) {
        var requiredFields = this.getRequiredFields(level);
        var completedFields = requiredFields.filter(function (field) {
            var value = formData[field.key];
            var validation = validationState[field.key];
            return value !== undefined && value !== '' && value !== null &&
                ((validation === null || validation === void 0 ? void 0 : validation.isValid) !== false);
        });
        var percentage = requiredFields.length > 0
            ? (completedFields.length / requiredFields.length) * 100
            : 100;
        var missingFields = requiredFields
            .filter(function (field) {
            var value = formData[field.key];
            var validation = validationState[field.key];
            return !value || value === '' || (validation === null || validation === void 0 ? void 0 : validation.isValid) === false;
        })
            .map(function (field) { return field.key; });
        return {
            percentage: percentage,
            canSubmit: percentage === 100,
            missingFields: missingFields
        };
    };
    /**
     * Get the next disclosure level
     */
    FormDisclosureManager.getNextLevel = function (currentLevel) {
        switch (currentLevel) {
            case 'casual':
                return 'enthusiast';
            case 'enthusiast':
                return 'expert';
            case 'expert':
                return null;
            default:
                return null;
        }
    };
    /**
     * Get target completion time for current level
     */
    FormDisclosureManager.getTargetTime = function (level) {
        return cider_1.DISCLOSURE_CONFIGS[level].targetTime;
    };
    /**
     * Create initial form state
     */
    FormDisclosureManager.createInitialFormState = function (level, userId) {
        if (level === void 0) { level = 'casual'; }
        if (userId === void 0) { userId = 'default-user'; }
        return {
            disclosureLevel: level,
            formData: {
                userId: userId,
                overallRating: 5 // Default rating
            },
            validationState: {},
            fieldStates: {},
            formCompleteness: {
                percentage: 0,
                canSubmit: false,
                missingFields: this.getRequiredFields(level).map(function (field) { return field.key; })
            },
            duplicateWarning: null,
            isSubmitting: false,
            startTime: Date.now()
        };
    };
    /**
     * Update form state with new field value
     */
    FormDisclosureManager.updateFormState = function (currentState, fieldKey, value, validationResult) {
        var _a, _b, _c;
        var newFormData = __assign(__assign({}, currentState.formData), (_a = {}, _a[fieldKey] = value, _a));
        var newValidationState = validationResult ? __assign(__assign({}, currentState.validationState), (_b = {}, _b[fieldKey] = {
            isValid: validationResult.isValid,
            errors: validationResult.errors,
            warnings: validationResult.warnings,
            suggestions: validationResult.suggestions,
            showFeedback: true
        }, _b)) : currentState.validationState;
        var newFieldStates = validationResult ? __assign(__assign({}, currentState.fieldStates), (_c = {}, _c[fieldKey] = validationResult.isValid ? 'valid' : 'error', _c)) : currentState.fieldStates;
        var formCompleteness = this.calculateFormCompleteness(newFormData, currentState.disclosureLevel, newValidationState);
        return {
            formData: newFormData,
            validationState: newValidationState,
            fieldStates: newFieldStates,
            formCompleteness: formCompleteness
        };
    };
    return FormDisclosureManager;
}());
exports.FormDisclosureManager = FormDisclosureManager;
/**
 * Get form sections for the current disclosure level
 */
function getFormSections(level) {
    var visibleFields = FormDisclosureManager.getVisibleFields(level);
    var sections = [
        {
            id: 'core',
            title: 'Essential Details',
            description: level === 'casual' ? 'Quick 30-second entry' : 'Basic cider information',
            fields: visibleFields.filter(function (field) { return field.section === 'core'; }),
            collapsible: false,
            defaultExpanded: true,
            requiredForLevel: ['casual', 'enthusiast', 'expert']
        }
    ];
    if (level !== 'casual') {
        sections.push({
            id: 'enthusiast',
            title: 'Additional Details',
            description: 'More comprehensive cider characteristics',
            fields: visibleFields.filter(function (field) { return field.section === 'enthusiast'; }),
            collapsible: true,
            defaultExpanded: level === 'enthusiast',
            requiredForLevel: ['enthusiast', 'expert']
        });
    }
    if (level === 'expert') {
        sections.push({
            id: 'expert',
            title: 'Expert Classification',
            description: 'Detailed technical information',
            fields: visibleFields.filter(function (field) { return field.section === 'expert'; }),
            collapsible: true,
            defaultExpanded: false,
            requiredForLevel: ['expert']
        });
    }
    // Optional section for all levels
    sections.push({
        id: 'optional',
        title: 'Optional',
        fields: visibleFields.filter(function (field) { return field.section === 'optional'; }),
        collapsible: true,
        defaultExpanded: false,
        requiredForLevel: []
    });
    return sections.filter(function (section) { return section.fields.length > 0; });
}
