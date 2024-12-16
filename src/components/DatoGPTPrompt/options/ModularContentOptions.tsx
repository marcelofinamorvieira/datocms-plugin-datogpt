import classNames from 'classnames';
import { Button } from 'datocms-react-ui';
import { AnimationControls, motion } from 'framer-motion';
import s from './styles.module.css';
import TranslateField, {
  fieldsThatDontNeedTranslation,
} from '../../../utils/TranslateField';
import { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import { ctxParamsType } from '../../../entrypoints/Config/ConfigScreen';

/**
 * PropTypes defines the properties expected by the ModularContentOptions component.
 *
 * @typedef {Object} PropTypes
 * @property {React.Dispatch<React.SetStateAction<string>>} setViewState - Function to update the UI view state of the prompt menu.
 * @property {RenderFieldExtensionCtx} ctx - The DatoCMS field extension context, providing information about the current field and environment.
 * @property {AnimationControls} controls - Animation controls used to animate UI elements, such as loading spinners.
 * @property {unknown} fieldValue - The current value of the modular content field. Can be localized or unlocalized.
 * @property {ctxParamsType} pluginParams - Configuration parameters for the plugin, including API keys and model details.
 */
type PropTypes = {
  setViewState: React.Dispatch<React.SetStateAction<string>>;
  ctx: RenderFieldExtensionCtx;
  controls: AnimationControls;
  fieldValue: unknown;
  pluginParams: ctxParamsType;
};

/**
 * ModularContentOptions Component
 *
 * This component renders a set of action buttons for modular content fields. It enables:
 *  - Prompting to generate a new modular block.
 *  - Prompting based on the current value (currently a placeholder button).
 *  - Translating the modular content to other locales if the field is localized and a primary locale is available.
 *
 * The logic checks if the field is localized and whether this is the primary locale, as well as if other locales exist.
 * Depending on these conditions, it shows a "Translate to all locales" or "Translate from main locale" button.
 *
 * Important details:
 * - The "Prompt to generate a block" button transitions the UI state from collapsed to a prompting state.
 * - The "Prompt based on current value" button is currently a placeholder (TODO marked).
 * - Translation buttons only appear if the field is localized and there are multiple locales.
 *
 * Assumptions:
 * - The pluginParams and ctx are valid and provide the necessary environment for the actions to work.
 * - The TranslateField function updates the field value to a translated version based on the chosen locales.
 *
 * Best Practices:
 * - Clear conditional checks to ensure buttons appear only when appropriate.
 * - Non-breaking refactoring: The code structure and logic remain the same, only comments and clarity improvements.
 */
const ModularContentOptions = ({
  setViewState,
  ctx,
  fieldValue,
  controls,
  pluginParams,
}: PropTypes) => {
  // Determine if there are multiple locales available in this record
  const hasOtherLocales =
    Array.isArray(ctx.formValues.internalLocales) &&
    ctx.formValues.internalLocales.length > 1;

  // Check if current locale is the primary locale (the first one in internalLocales array)
  const isPrimaryLocale = !!(
    hasOtherLocales &&
    (ctx.formValues.internalLocales as string[])[0] === ctx.locale
  );

  // Identify the field type for conditional logic
  const fieldType = ctx.field.attributes.appearance.editor;

  /**
   * Determine if the field is localized and the main locale has a value.
   * A field is considered localized and having a main locale value if:
   * - The field type is not in fieldsThatDontNeedTranslation.
   * - There are multiple locales.
   * - The field value is an object with at least a value for the primary locale.
   */
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

  return (
    <motion.div
      className={classNames(s.buttonsContainer)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      {/* 
        Button: Prompt to generate a block
        On click: Collapses the current view and after a short delay sets it to the "prompting" state.
      */}
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

      {/* 
        Button: Prompt based on current value (Placeholder)
        On click: Currently does nothing but is reserved for future functionality.
      */}
      <div
        key="prompt-button"
        onClick={() => {
          // TODO: Implement prompt based on current value for modular content
        }}
        className={classNames(s.buttonsContainer)}
      >
        <Button buttonSize="xxs" buttonType="muted">
          Prompt based on current value
        </Button>
      </div>

      {/**
       * Conditional Buttons for Translation:
       *
       * 1. Translate to all locales:
       *    - Appears if the field is localized, multiple locales exist, and we are in the primary locale.
       *    - On click: Translates the field from the current main locale to all other locales.
       *
       * 2. Translate from main locale:
       *    - Appears if the field is localized, multiple locales exist, and we are NOT in the primary locale.
       *    - On click: Translates the field from the main locale to the current locale.
       */}

      {isLocalized && hasOtherLocales && isPrimaryLocale && (
        <div key="generate-button" className={classNames(s.buttonsContainer)}>
          <Button
            buttonSize="xxs"
            buttonType="muted"
            onClick={() => {
              // Extract all other locales except the primary one
              const otherLocales = (
                ctx.formValues.internalLocales as string[]
              ).slice(1);
              otherLocales.forEach((locale) => {
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
