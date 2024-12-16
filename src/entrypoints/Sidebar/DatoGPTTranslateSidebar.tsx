//********************************************************************************************
// DatoGPTTranslateSidebar.tsx
//
// This file provides a sidebar panel allowing users to translate all fields of a record
// from one locale to others. It includes improved asynchronous state handling and leverages
// a dedicated utility function to manage the translation logic, thereby keeping this file
// more focused and maintainable.
//
// Functionality:
// - The user selects a source locale and one or multiple target locales.
// - On clicking "Translate all fields", it invokes the utility function to perform batch translation.
// - While translating, a loading spinner is shown, and after completion, a success notice appears.
//
//********************************************************************************************

import { RenderItemFormSidebarPanelCtx } from 'datocms-plugin-sdk';
import { Button, Canvas, SelectField, Spinner } from 'datocms-react-ui';
import { useState } from 'react';
import { ctxParamsType } from '../Config/ConfigScreen';
import { motion, AnimatePresence } from 'framer-motion';

// Import the dedicated translation utility function:
import { translateRecordFields } from '../../utils/translate/translateRecordFields';

type PropTypes = {
  ctx: RenderItemFormSidebarPanelCtx;
};

function DatoGPTTranslateSidebar({ ctx }: PropTypes) {
  // Retrieve the plugin parameters, expecting API keys and model details
  const pluginParams = ctx.plugin.attributes.parameters as ctxParamsType;

  // The first locale in `internalLocales` is considered the "source" or "base" locale
  const [selectedLocale, setSelectedLocale] = useState<string>(
    (ctx.formValues.internalLocales as Array<string>)[0]
  );

  // By default, all other locales are the target locales
  const [selectedLocales, setSelectedLocales] = useState<Array<string>>(
    (ctx.formValues.internalLocales as Array<string>).filter(
      (locale) => locale !== selectedLocale
    )
  );

  // isLoading is used to manage the loading state machine:
  // false = idle, true = translating
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // If no valid API key or model is configured, prompt the user to fix configuration
  if (!pluginParams.apiKey || !pluginParams.gptModel) {
    return <div>Please insert a valid API Key and select a GPT Model</div>;
  }

  //--------------------------------------------------------------------------------------------
  // handleTranslateAllFields
  //
  // This function triggers the translation of all fields by invoking the utility function.
  // It updates the loading state before and after the operation to show the user a spinner
  // and a completion message.
  //--------------------------------------------------------------------------------------------
  async function handleTranslateAllFields() {
    // Move to loading state
    setIsLoading(true);

    try {
      // Perform the translation using the dedicated utility function
      await translateRecordFields(
        ctx,
        pluginParams,
        selectedLocales,
        selectedLocale
      );

      // After success, show a success notification
      ctx.notice('All fields translated successfully');
    } catch (error: any) {
      // If an error occurs, show an alert with the error message
      ctx.alert(
        error.message || 'An unknown error occurred during translation'
      );
    } finally {
      // Return to idle state regardless of outcome
      setIsLoading(false);
    }
  }

  //--------------------------------------------------------------------------------------------
  // Render
  //
  // Displays either:
  // - The configuration form (if isLoading = false)
  // - A loading spinner (if isLoading = true)
  //--------------------------------------------------------------------------------------------
  return (
    <Canvas ctx={ctx}>
      <AnimatePresence mode="wait">
        {!isLoading ? (
          // When not loading, show the form
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              marginBottom: '1rem',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Locale selection row */}
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <h3>From</h3>
              <SelectField
                name="fromLocale"
                id="fromLocale"
                label=""
                value={[{ label: selectedLocale, value: selectedLocale }]}
                selectInputProps={{
                  isMulti: false,
                  options: (
                    ctx.formValues.internalLocales as Array<string>
                  ).map((locale) => ({
                    label: locale,
                    value: locale,
                  })),
                }}
                onChange={(newValue) => {
                  // On changing the source locale, update the target locales accordingly
                  const newSourceLocale = newValue?.value || selectedLocale;
                  setSelectedLocale(newSourceLocale);
                  setSelectedLocales(
                    (ctx.formValues.internalLocales as Array<string>).filter(
                      (locale) => locale !== newSourceLocale
                    )
                  );
                }}
              />
              <h3>To</h3>
            </div>

            {/* Target locale selection row */}
            <div style={{ marginBottom: '1rem' }}>
              <SelectField
                name="toLocales"
                id="toLocales"
                label=""
                value={selectedLocales.map((locale) => ({
                  label: locale,
                  value: locale,
                }))}
                selectInputProps={{
                  isMulti: true,
                  options: (ctx.formValues.internalLocales as Array<string>)
                    .filter((locale) => locale !== selectedLocale)
                    .map((locale) => ({
                      label: locale,
                      value: locale,
                    })),
                }}
                onChange={(newValue) => {
                  // Update the selected target locales based on user input
                  setSelectedLocales(
                    newValue?.map((locale) => locale.value) || []
                  );
                }}
              />
            </div>

            {/* Button to initiate the translation */}
            <Button fullWidth onClick={handleTranslateAllFields}>
              Translate all fields
            </Button>
          </motion.div>
        ) : (
          // When loading, show a spinner
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Spinner size={48} />
            <h1
              style={{
                margin: '1rem',
                textAlign: 'center',
                color: 'gray',
              }}
            >
              Translating...
            </h1>
          </motion.div>
        )}
      </AnimatePresence>
    </Canvas>
  );
}

export default DatoGPTTranslateSidebar;
