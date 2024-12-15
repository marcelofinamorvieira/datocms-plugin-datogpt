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
};

const ModularContentOptions = ({
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
    !fieldsThatDontNeedTranslation.includes(
      fieldType
    ) &&
    hasOtherLocales &&
    fieldValue &&
    typeof fieldValue === 'object' &&
    !Array.isArray(fieldValue) &&
    (fieldValue as Record<string, unknown>)[
      (ctx.formValues.internalLocales as string[])[0]
    ]
  );

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
      <div key="prompt-button" className={classNames(s.buttonsContainer)}>
        <Button buttonSize="xxs" buttonType="muted">
          Prompt based on current value
        </Button>
      </div>
      {isLocalized && hasOtherLocales && isPrimaryLocale && (
        <div key="generate-button" className={classNames(s.buttonsContainer)}>
          <Button
            buttonSize="xxs"
            buttonType="muted"
            onClick={() => {
              (ctx.formValues.internalLocales as string[])
                .slice(1)
                .forEach((locale) => {
                  TranslateField(
                    setViewState,
                    (fieldValue as Record<string, unknown>)[ctx.locale],
                    ctx,
                    controls,
                    pluginParams,
                    locale,
                    fieldType
                  );
                });
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

export default ModularContentOptions;
