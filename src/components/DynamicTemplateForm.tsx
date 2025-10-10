import React, { useState } from 'react';
import { UserInput, templateParserService } from '../services/templateParserService';

interface DynamicTemplateFormProps {
  userInputs: UserInput[];
  onSubmit: (values: Record<string, any>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function DynamicTemplateForm({ userInputs, onSubmit, onCancel, loading }: DynamicTemplateFormProps) {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (key: string, value: any) => {
    setFormValues(prev => ({ ...prev, [key]: value }));

    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const input of userInputs) {
      if (!templateParserService.shouldDisplayInput(input, formValues)) {
        continue;
      }

      const value = formValues[input.key];

      if (input.required && !value) {
        newErrors[input.key] = `${input.label} is required`;
        continue;
      }

      if (value && input.validation) {
        if (input.validation.minLength && String(value).length < input.validation.minLength) {
          newErrors[input.key] = `Must be at least ${input.validation.minLength} characters`;
        }

        if (input.validation.maxLength && String(value).length > input.validation.maxLength) {
          newErrors[input.key] = `Must be at most ${input.validation.maxLength} characters`;
        }

        if (input.validation.pattern && !new RegExp(input.validation.pattern).test(String(value))) {
          newErrors[input.key] = `Invalid format`;
        }

        if (input.validation.min !== undefined && Number(value) < input.validation.min) {
          newErrors[input.key] = `Must be at least ${input.validation.min}`;
        }

        if (input.validation.max !== undefined && Number(value) > input.validation.max) {
          newErrors[input.key] = `Must be at most ${input.validation.max}`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formValues);
    }
  };

  const renderInput = (input: UserInput) => {
    if (!templateParserService.shouldDisplayInput(input, formValues)) {
      return null;
    }

    const value = formValues[input.key] || '';
    const error = errors[input.key];

    const commonClasses = "w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white";

    switch (input.type) {
      case 'select':
        return (
          <div key={input.key} className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {input.label}
              {input.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {input.description && (
              <p className="text-xs text-gray-400 mb-2">{input.description}</p>
            )}
            <select
              value={value}
              onChange={(e) => handleChange(input.key, e.target.value)}
              className={commonClasses}
              required={input.required}
            >
              <option value="">Select an option</option>
              {input.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>
        );

      case 'slider':
        return (
          <div key={input.key} className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {input.label}: {value || input.validation?.min || 0}
              {input.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {input.description && (
              <p className="text-xs text-gray-400 mb-2">{input.description}</p>
            )}
            <input
              type="range"
              min={input.validation?.min || 0}
              max={input.validation?.max || 100}
              value={value || input.validation?.min || 0}
              onChange={(e) => handleChange(input.key, Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              required={input.required}
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>
        );

      case 'password':
        return (
          <div key={input.key} className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {input.label}
              {input.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {input.description && (
              <p className="text-xs text-gray-400 mb-2">{input.description}</p>
            )}
            <input
              type="password"
              value={value}
              onChange={(e) => handleChange(input.key, e.target.value)}
              placeholder={input.placeholder}
              className={commonClasses}
              required={input.required}
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>
        );

      case 'number':
        return (
          <div key={input.key} className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {input.label}
              {input.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {input.description && (
              <p className="text-xs text-gray-400 mb-2">{input.description}</p>
            )}
            <input
              type="number"
              value={value}
              onChange={(e) => handleChange(input.key, Number(e.target.value))}
              placeholder={input.placeholder}
              min={input.validation?.min}
              max={input.validation?.max}
              className={commonClasses}
              required={input.required}
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>
        );

      case 'email':
      case 'text':
      case 'time':
      default:
        return (
          <div key={input.key} className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {input.label}
              {input.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {input.description && (
              <p className="text-xs text-gray-400 mb-2">{input.description}</p>
            )}
            <input
              type={input.type}
              value={value}
              onChange={(e) => handleChange(input.key, e.target.value)}
              placeholder={input.placeholder}
              className={commonClasses}
              required={input.required}
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="max-h-96 overflow-y-auto px-1">
        {userInputs.map(input => renderInput(input))}
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Workflow'}
        </button>
      </div>
    </form>
  );
}
