//********************************************************************************************
// DefaultOptions.tsx
//
// This component renders various action buttons for a given CMS field, such as generating new values,
// improving existing values, or translating content between locales.
//
//********************************************************************************************

import classNames from 'classnames';
import { Button } from 'datocms-react-ui';
import { AnimationControls, motion } from 'framer-motion';
import s from './styles.module.css';
import TranslateField, {
  fieldsThatDontNeedTranslation,
} from '../../../utils/TranslateField';
import { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import { ctxParamsType } from '../../../entrypoints/Config/ConfigScreen';
import {
  textFieldTypes,
  translateFieldTypes,
} from '../../../entrypoints/Config/AdvancedSettings';

//--------------------------------------------------------------------------------------------
// PropTypes: Defines the shape of the props this component expects.
//
// setViewState: A React state setter function to update the current UI view state.
// ctx: DatoCMS field extension context object, providing metadata and methods for field actions.
// controls: AnimationControls for managing visual transitions.
// fieldValue: The current value of the field this component is attached to.
// pluginParams: Configuration parameters for the plugin.
//
//--------------------------------------------------------------------------------------------
type PropTypes = {
  setViewState: React.Dispatch<React.SetStateAction<string>>;
  ctx: RenderFieldExtensionCtx;
  controls: AnimationControls;
  fieldValue: unknown;
  pluginParams: ctxParamsType;
};

//--------------------------------------------------------------------------------------------
// OptionsButton Component:
// A small helper component to render a button with consistent styling and behavior.
//
// Parameters:
//   onClick:   Function called when the button is pressed.
//   label:     Text displayed on the button.
//   buttonType: Type of the button style ("muted", "primary", etc.).
//
// This promotes DRY (Don't Repeat Yourself) principles and makes buttons easier to maintain.
//--------------------------------------------------------------------------------------------
function OptionsButton({
  onClick,
  label,
  buttonType = 'muted',
}: {
  onClick: () => void;
  label: string;
  buttonType?: 'muted' | 'primary';
}) {
  return (
    <Button onClick={onClick} buttonSize="xxs" buttonType={buttonType}>
      {label}
    </Button>
  );
}

//--------------------------------------------------------------------------------------------
// DefaultOptions Component
//
// This component displays a set of buttons that allow the user to perform various actions on
// the current field value, including prompting to generate a new value, improving the current
// value, and translating values to other locales.
//
// Logic:
// - Checks if the field has multiple locales.
// - Determines if the field is localized and what actions are allowed (e.g., translation).
// - Shows the appropriate buttons based on plugin settings and the current field type/value.
//
//--------------------------------------------------------------------------------------------
const DefaultOptions = ({
  setViewState,
  ctx,
  fieldValue,
  controls,
  pluginParams,
}: PropTypes) => {
  // Check if other locales exist
  const hasOtherLocales =
    Array.isArray(ctx.formValues.internalLocales) &&
    ctx.formValues.internalLocales.length > 1;

  // Check if current locale is the primary locale
  const isPrimaryLocale = !!(
    hasOtherLocales &&
    (ctx.formValues.internalLocales as string[])[0] === ctx.locale
  );

  const fieldType = ctx.field.attributes.appearance.editor;

  // Determine if field is localized and if main locale has a value
  const isLocalized = !!(
    !fieldsThatDontNeedTranslation.includes(fieldType) &&
    hasOtherLocales &&
    !ctx.parentField &&
    fieldValue &&
    typeof fieldValue === 'object' &&
    !Array.isArray(fieldValue) &&
    (fieldValue as Record<string, unknown>)[
      (ctx.formValues.internalLocales as string[])[0]
    ]
  );

  // Check if the current locale has a non-empty value
  let isEmptyStructuredText =
    fieldType === 'structured_text' &&
    Array.isArray(fieldValue) &&
    fieldValue.length === 1 &&
    typeof fieldValue[0] === 'object' &&
    fieldValue[0] !== null &&
    'type' in fieldValue[0] &&
    fieldValue[0].type === 'paragraph' &&
    fieldValue[0].children.length === 1 &&
    fieldValue[0].children[0].text === '';

  let hasFieldValueInThisLocale = !!fieldValue && !isEmptyStructuredText;

  if (
    fieldValue &&
    typeof fieldValue === 'object' &&
    !Array.isArray(fieldValue) &&
    ctx.locale in (fieldValue as Record<string, unknown>)
  ) {
    const fieldValueInThisLocale = (fieldValue as Record<string, unknown>)[
      ctx.locale
    ];

    isEmptyStructuredText =
      fieldType === 'structured_text' &&
      Array.isArray(fieldValueInThisLocale) &&
      fieldValueInThisLocale.length === 1 &&
      typeof fieldValueInThisLocale[0] === 'object' &&
      fieldValueInThisLocale[0] !== null &&
      'type' in fieldValueInThisLocale[0] &&
      fieldValueInThisLocale[0].type === 'paragraph' &&
      fieldValueInThisLocale[0].children.length === 1 &&
      fieldValueInThisLocale[0].children[0].text === '';

    hasFieldValueInThisLocale =
      !!fieldValueInThisLocale && !isEmptyStructuredText;
  }

  //------------------------------------------------------------------------------------------
  // Render Buttons
  //------------------------------------------------------------------------------------------

  return (
    <motion.div
      className={classNames(s.buttonsContainer)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      {/* "Generate value" button: visible if field type is in generateValueFields */}
      {pluginParams.advancedSettings.generateValueFields.includes(
        fieldType as keyof typeof textFieldTypes
      ) && (
        <div key="prompting-button" className={classNames(s.buttonsContainer)}>
          <OptionsButton
            onClick={() => {
              setViewState('collapsed');
              setTimeout(() => {
                setViewState('prompting');
              }, 250);
            }}
            label="Prompt to generate new value"
          />
        </div>
      )}

      {/* "Improve current value" button: visible if field has a value and is listed in improveValueFields */}
      {hasFieldValueInThisLocale &&
        pluginParams.advancedSettings.improveValueFields.includes(
          fieldType as keyof typeof textFieldTypes
        ) && (
          <div key="prompt-button" className={classNames(s.buttonsContainer)}>
            <OptionsButton
              onClick={() => {
                setViewState('collapsed');
                setTimeout(() => {
                  setViewState('prompting-improve');
                }, 250);
              }}
              label="Prompt to improve current value"
            />
          </div>
        )}

      {/* "Translate to all locales" button: visible if field is localized and we're on the primary locale */}
      {isLocalized &&
        hasOtherLocales &&
        isPrimaryLocale &&
        pluginParams.advancedSettings.translationFields.includes(
          fieldType as keyof typeof translateFieldTypes
        ) && (
          <div key="generate-button" className={classNames(s.buttonsContainer)}>
            <OptionsButton
              onClick={async () => {
                const locales = (
                  ctx.formValues.internalLocales as string[]
                ).slice(1);
                for (let i = 0; i < locales.length; i++) {
                  await TranslateField(
                    setViewState,
                    (fieldValue as Record<string, unknown>)[ctx.locale],
                    ctx,
                    controls,
                    pluginParams,
                    locales[i],
                    fieldType
                  );
                }
              }}
              label="Translate to all locales"
            />
          </div>
        )}

      {/* "Translate from main locale" button: visible if field is localized and we're NOT on the primary locale */}
      {isLocalized &&
        hasOtherLocales &&
        !isPrimaryLocale &&
        pluginParams.advancedSettings.translationFields.includes(
          fieldType as keyof typeof translateFieldTypes
        ) && (
          <div key="generate-button" className={classNames(s.buttonsContainer)}>
            <OptionsButton
              onClick={() => {
                TranslateField(
                  setViewState,
                  (fieldValue as Record<string, unknown>)[
                    (ctx.formValues.internalLocales as string[])[0]
                  ],
                  ctx,
                  controls,
                  pluginParams,
                  ctx.locale,
                  fieldType
                );
              }}
              label="Translate from main locale"
            />
          </div>
        )}
    </motion.div>
  );
};

export default DefaultOptions;
