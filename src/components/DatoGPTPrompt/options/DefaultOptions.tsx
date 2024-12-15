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
};

const DefaultOptions = ({
  setViewState,
  ctx,
  fieldValue,
  controls,
  pluginParams,
}: PropTypes) => {
  const hasOtherLocales =
    Array.isArray(ctx.formValues.internalLocales) &&
    ctx.formValues.internalLocales.length > 1;

  const isPrimaryLocale = !!(
    hasOtherLocales &&
    (ctx.formValues.internalLocales as string[])[0] === ctx.locale
  );

  const fieldType = ctx.field.attributes.appearance.editor;

  //is localized and the main locale field has a value
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
    //if the field is localized
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
            Prompt to generate new value
          </Button>
        </div>
      )}

      {hasFieldValueInThisLocale &&
        pluginParams.advancedSettings.improveValueFields.includes(
          fieldType as keyof typeof textFieldTypes
        ) && (
          <div key="prompt-button" className={classNames(s.buttonsContainer)}>
            <Button
              buttonSize="xxs"
              onClick={() => {
                setViewState('collapsed');
                setTimeout(() => {
                  setViewState('prompting-improve');
                }, 250);
              }}
              buttonType="muted"
            >
              Prompt to improve current value
            </Button>
          </div>
        )}

      {isLocalized &&
        hasOtherLocales &&
        isPrimaryLocale &&
        pluginParams.advancedSettings.translationFields.includes(
          fieldType as keyof typeof translateFieldTypes
        ) && (
          <div key="generate-button" className={classNames(s.buttonsContainer)}>
            <Button
              buttonSize="xxs"
              buttonType="muted"
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
            >
              Translate to all locales
            </Button>
          </div>
        )}
      {isLocalized &&
        hasOtherLocales &&
        !isPrimaryLocale &&
        pluginParams.advancedSettings.translationFields.includes(
          fieldType as keyof typeof translateFieldTypes
        ) && (
          <div key="generate-button" className={classNames(s.buttonsContainer)}>
            <Button
              buttonSize="xxs"
              buttonType="muted"
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
            >
              Translate from main locale
            </Button>
          </div>
        )}
    </motion.div>
  );
};

export default DefaultOptions;
