//********************************************************************************************
// DefaultOptions.tsx
//
// This component renders various action buttons for a given CMS field, such as generating new values,
// improving existing values, or translating content between locales.
//
// Newly added feature:
// - When user clicks on "Translate to all locales" or "Translate from main locale",
//   we now display a gray text indicator next to the spinner indicating what field is being translated and to which locale.
//
// Logic:
// - We receive isLoadingTranslation and translationMessage setters from parent (DatoGPTPrompt).
// - Before calling TranslateField, set isLoadingTranslation=true and setTranslationMessage to show which locale is being processed.
// - After the translation for all target locales completes, set isLoadingTranslation=false and clear message.
//
//--------------------------------------------------------------------------------------------

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

type PropTypes = {
  setViewState: React.Dispatch<React.SetStateAction<string>>;
  ctx: RenderFieldExtensionCtx;
  controls: AnimationControls;
  fieldValue: unknown;
  pluginParams: ctxParamsType;
  isLoadingTranslation: boolean;
  setIsLoadingTranslation: React.Dispatch<React.SetStateAction<boolean>>;
  translationMessage: string;
  setTranslationMessage: React.Dispatch<React.SetStateAction<string>>;
};

function OptionsButton({
  onClick,
  label,
  buttonType = 'muted',
}: {
  onClick: () => void | Promise<void>;
  label: string;
  buttonType?: 'muted' | 'primary';
}) {
  return (
    <Button onClick={onClick} buttonSize="xxs" buttonType={buttonType}>
      {label}
    </Button>
  );
}

const DefaultOptions = ({
  setViewState,
  ctx,
  fieldValue,
  controls,
  pluginParams,
  setIsLoadingTranslation,
  setTranslationMessage,
}: PropTypes) => {
  const hasOtherLocales =
    Array.isArray(ctx.formValues.internalLocales) &&
    ctx.formValues.internalLocales.length > 1;
  const isPrimaryLocale = !!(
    hasOtherLocales &&
    (ctx.formValues.internalLocales as string[])[0] === ctx.locale
  );

  const fieldType = ctx.field.attributes.appearance.editor;
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

  return (
    <motion.div
      className={classNames(s.buttonsContainer)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
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
                setIsLoadingTranslation(true);
                const mainLocale = (
                  ctx.formValues.internalLocales as string[]
                )[0];
                // Set a generic message first
                setTranslationMessage(
                  `Translating ${ctx.field.attributes.label} from ${mainLocale} to all locales...`
                );
                for (let i = 0; i < locales.length; i++) {
                  const locale = locales[i];
                  setTranslationMessage(
                    `Translating ${ctx.field.attributes.label} from ${mainLocale} to ${locale}...`
                  );
                  await TranslateField(
                    setViewState,
                    (fieldValue as Record<string, unknown>)[ctx.locale],
                    ctx,
                    controls,
                    pluginParams,
                    locale,
                    fieldType
                  );
                }
                setIsLoadingTranslation(false);
                setTranslationMessage('');
              }}
              label="Translate to all locales"
            />
          </div>
        )}

      {isLocalized &&
        hasOtherLocales &&
        !isPrimaryLocale &&
        pluginParams.advancedSettings.translationFields.includes(
          fieldType as keyof typeof translateFieldTypes
        ) && (
          <div key="generate-button" className={classNames(s.buttonsContainer)}>
            <OptionsButton
              onClick={async () => {
                setIsLoadingTranslation(true);
                const mainLocale = (
                  ctx.formValues.internalLocales as string[]
                )[0];
                const targetLocale = ctx.locale;
                setTranslationMessage(
                  `Translating ${ctx.field.attributes.label} from ${mainLocale} to ${targetLocale}...`
                );
                await TranslateField(
                  setViewState,
                  (fieldValue as Record<string, unknown>)[mainLocale],
                  ctx,
                  controls,
                  pluginParams,
                  ctx.locale,
                  fieldType
                );
                setIsLoadingTranslation(false);
                setTranslationMessage('');
              }}
              label="Translate from main locale"
            />
          </div>
        )}
    </motion.div>
  );
};

export default DefaultOptions;
