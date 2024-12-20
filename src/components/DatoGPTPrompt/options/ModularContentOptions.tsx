//********************************************************************************************
// ModularContentOptions.tsx
//
// This component renders a set of action buttons for modular content fields (rich_text).
// It allows generating a new block, improving current blocks, and translating content.
//
// Newly added feature:
// - When clicking "Translate to all locales" or "Translate from main locale",
//   we now show a gray text indicator next to the spinner indicating the ongoing translation action.
//
// Logic:
// - Similar to DefaultOptions, we now have isLoadingTranslation and translationMessage passed down.
// - Before calling TranslateField, set isLoadingTranslation=true and setTranslationMessage.
// - After finishing all translations, reset these states.
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

function ModularContentOptions({
  setViewState,
  ctx,
  controls,
  fieldValue,
  pluginParams,
  isLoadingTranslation,
  setIsLoadingTranslation,
  translationMessage,
  setTranslationMessage,
}: PropTypes) {
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
      <div key="prompting-button" className={classNames(s.buttonsContainer)}>
        <Button
          onClick={() => {
            setViewState('collapsed');
            setTimeout(() => {
              setViewState('prompting');
            }, 250);
          }}
          buttonSize="xxs"
          buttonType="muted"
        >
          Prompt to generate a block
        </Button>
      </div>

      <div
        key="prompt-button"
        onClick={() => {
          setViewState('collapsed');
          setTimeout(() => {
            setViewState('prompting-improve');
          }, 250);
        }}
        className={classNames(s.buttonsContainer)}
      >
        <Button buttonSize="xxs" buttonType="muted">
          Prompt to improve current blocks
        </Button>
      </div>

      {isLocalized && hasOtherLocales && isPrimaryLocale && (
        <div key="generate-button" className={classNames(s.buttonsContainer)}>
          <Button
            buttonSize="xxs"
            buttonType="muted"
            onClick={async () => {
              const locales = (
                ctx.formValues.internalLocales as string[]
              ).slice(1);
              const mainLocale = (ctx.formValues.internalLocales as string[])[0];
              setIsLoadingTranslation(true);
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
          >
            Translate to all locales
          </Button>
        </div>
      )}

      {isLocalized && hasOtherLocales && !isPrimaryLocale && (
        <div key="generate-button" className={classNames(s.buttonsContainer)}>
          <Button
            buttonSize="xxs"
            buttonType="muted"
            onClick={async () => {
              setIsLoadingTranslation(true);
              const mainLocale = (ctx.formValues.internalLocales as string[])[0];
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
          >
            Translate from main locale
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export default ModularContentOptions;