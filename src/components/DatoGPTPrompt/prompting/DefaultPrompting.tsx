import { motion } from 'framer-motion';
import { Button, TextField } from 'datocms-react-ui';
import React from 'react';

////////////////////////////////////////////////////////////////////////////////
// DefaultPrompting Component File
//
// This file provides a user interface for prompting the generation or improvement
// of a field's value. It includes an input area for users to write their prompt
// and a button to trigger the prompt generation.
//
// The component is divided into two main parts:
//
// 1. DefaultPrompting: The parent component that handles the overall layout,
//    prompt submission, and integration with the external handle function.
//
// 2. PromptInput: A small sub-component responsible solely for rendering and
//    managing the text input and prompt submission button, making the code
//    more modular and easier to maintain.
//
// Both components are fully commented to facilitate future updates and
// maintenance without confusion.
//
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// PropTypes for DefaultPrompting
//
// handleGeneratePrompt: A callback function that will be executed when the user
//                       presses the prompt button or hits "Enter" to generate
//                       or improve the field value.
//
// prompt:               A string representing the current prompt entered by
//                       the user.
//
// setPrompt:            A state setter function to update the prompt value.
//
// isImprove:            A boolean indicating whether the user is improving an
//                       existing value (true) or generating a new one (false).
//
////////////////////////////////////////////////////////////////////////////////
type PropTypes = {
  handleGeneratePrompt: () => void;
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  isImprove: boolean;
};

////////////////////////////////////////////////////////////////////////////////
// PromptInput Component
//
// This sub-component encapsulates the text input and the submission button,
// making the main DefaultPrompting component cleaner and easier to reason about.
//
// Responsibilities:
// - Render a TextField for the user to input the prompt text.
// - Render a Button to trigger the prompt generation.
//
// It leverages `onKeyDown` to detect the "Enter" key, ensuring a smooth user
// experience: pressing Enter will generate or improve the value as if clicking
// the button.
//
// This separation allows for easier future modifications, such as adding more
// fields or changing the styling without cluttering the main component.
//
////////////////////////////////////////////////////////////////////////////////
function PromptInput({
  prompt,
  setPrompt,
  handleGeneratePrompt,
}: {
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  handleGeneratePrompt: () => void;
}) {
  return (
    <motion.div
      // The motion.div is used from Framer Motion to allow future
      // animations or transitions if needed. Currently, it simply manages
      // fade-in/fade-out animations upon state changes.
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      style={{ display: 'flex', gap: '4px', width: '100%' }}
      onKeyDown={(e) => {
        // When the user presses Enter, we trigger the prompt generation.
        if (e.key === 'Enter') {
          handleGeneratePrompt();
        }
      }}
    >
      {/* TextField: user input for the prompt */}
      <TextField
        name="prompt"
        id="prompt"
        label=""
        value={prompt}
        placeholder="Write a prompt"
        onChange={(newValue) => setPrompt(newValue)}
      />

      {/* Button: triggers the prompt generation */}
      <Button
        onClick={() => {
          handleGeneratePrompt();
        }}
        buttonSize="xxs"
        buttonType="muted"
      >
        Prompt
      </Button>
    </motion.div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// DefaultPrompting Component
//
// This component manages the layout and uses PromptInput to render the prompt
// field and button. It also handles logic to differentiate between generating a
// new value or improving an existing value, reflected by the `isImprove` prop.
//
// Responsibilities:
// - Render the prompt input interface.
// - Call the provided `handleGeneratePrompt` callback when the user decides
//   to generate/improve the value.
//
// Note: The `isImprove` variable is currently used only to distinguish semantics
// and may be expanded later if needed.
//
// Animation:
// - Uses motion.div for fade-in and fade-out transitions when the component
//   mounts or unmounts, improving the user experience.
//
////////////////////////////////////////////////////////////////////////////////
const DefaultPrompting = ({
  handleGeneratePrompt,
  prompt,
  setPrompt,
  isImprove,
}: PropTypes) => {
  return (
    <motion.div
      // Animate the component's entry and exit for a smoother UI experience
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      // This className relies on styles defined in a .css file outside this scope
      // Typically, s.promptBar ensures a consistent look with spacing, font size, etc.
      style={{ display: 'flex', gap: '4px', width: '100%' }}
    >
      {/* PromptInput handles the text input and prompt submission button */}
      <PromptInput
        prompt={prompt}
        setPrompt={setPrompt}
        handleGeneratePrompt={handleGeneratePrompt}
      />

      {/* 
        Additional actions can be placed here in the future.
        For example, if we decide to add another button or a dropdown 
        for special prompt modes, it can be easily integrated.
      */}

      {/* If further UI elements or conditional UI states are needed (e.g., 
          a 'Prompt with context' button), they can be added here. */}
    </motion.div>
  );
};

export default DefaultPrompting;
