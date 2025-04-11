    /**
     * ProductForm Custom Element - Just-in-Time Query Approach
     * Queries for form and variant ID input directly inside the click handler
     * to mitigate potential timing issues.
     */
    
    // Define the custom element class first
    if (!customElements.get('product-form')) {
      customElements.define(
        'product-form',
        class ProductForm extends HTMLElement {
          constructor() {
            super(); 
            // Keep basic element selections if needed elsewhere, but avoid relying on them for handler logic
            this.submitButton = this.querySelector('[type="submit"]'); 
            this.submitButtonText = this.submitButton ? this.submitButton.querySelector('span') : null;
            this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
            this.hideErrors = this.dataset.hideErrors === 'true';
            
            // Bind the handler once
            this.boundButtonClickHandler = this.onButtonClickHandler.bind(this); 
            console.log('[ProductForm Constructor] Initialized (Just-in-Time Query Version).'); 
          }

          connectedCallback() {
            console.log('[ProductForm connectedCallback] Element lagt til DOM.');
            // Listener attachment via DOMContentLoaded remains the same (outside class)
          }

          disconnectedCallback() {
             console.log('[ProductForm disconnectedCallback] Element fjernet fra DOM.');
             // Listener removal should ideally happen in the DOMContentLoaded cleanup if possible,
             // but requires storing references globally or on the element.
          }

          /**
           * Helper function to get validation configuration.
           * NOW receives the currently selected variant ID input element as an argument.
           * @param {HTMLInputElement | null} currentVariantIdInput - The hidden input element [name=id].
           * @param {HTMLElement} formElement - The form element containing the radios/labels.
           * @returns {object | null} - The config {min, max, value} or null.
           */
          _getUploadValidationConfig(currentVariantIdInput, formElement) {
              console.log("--- Inne i _getUploadValidationConfig ---"); 
              if (!formElement) { console.error('[Validation Helper] Fikk ikke formElement!'); return null; }
              if (!currentVariantIdInput) { 
                  console.warn('[Validation Helper] Fikk ikke currentVariantIdInput!'); 
                  return null; 
              }
              console.log("[Validation Helper] Mottatt Variant ID Input Value:", currentVariantIdInput.value); 

              // Find the radio button corresponding to the passed input's value
              const selector = `input[type="radio"][name="id"][value="${currentVariantIdInput.value}"]`;
              const selectedRadio = formElement.querySelector(selector);

              if (!selectedRadio) { console.log('[Validation Helper] Ingen variant radio-knapp funnet som valgt for mottatt ID.'); return null; }
              console.log("[Validation Helper] Fant selectedRadio:", selectedRadio); 

              const rangeMap = { /* ... remains the same ... */ };
              const labelSelector = `label[for="${selectedRadio.id}"]`;
              const label = formElement.querySelector(labelSelector);
              const labelText = label ? label.textContent.trim() : "";
              console.log("[Validation Helper] Label Text:", `"${labelText}"`); 

              const regex = /\b(1|5|10|20)\b/;
              const match = labelText.match(regex); 
              console.log("[Validation Helper] Resultat av match (regex):", match); 

              if (match) { 
                  const num = parseInt(match[1], 10);
                  if (rangeMap[num]) {
                      console.log(`[Validation Helper] Fant config for ${num} bilder.`);
                      return rangeMap[num]; 
                  }
              }
              console.warn(`[Validation Helper] Fant ingen match (1,5,10,20) i label text. Returnerer null.`); 
              return null; 
          }

          /**
           * Handles the submit button CLICK event. 
           * Queries for form and variant ID input just-in-time.
           * @param {Event} evt - The click event object.
           */
          onButtonClickHandler(evt) {
              console.warn('>>> onButtonClickHandler KJØRER! Starter validering...'); 
              
              // Find form and variant ID input NOW
              const currentForm = this.querySelector('form'); // Query relative to this custom element
              const idInput = currentForm ? currentForm.querySelector('[name=id]') : null;
              
              console.log("[ClickHandler] Fant form:", currentForm); // DEBUG
              console.log("[ClickHandler] Fant idInput (name=id):", idInput); // DEBUG

              if (!currentForm || !idInput) {
                  console.error("[ClickHandler] KRITISK FEIL: Fant ikke form eller [name=id] input ved klikk! Kan ikke validere.");
                  // Decide how to handle this - maybe allow submission, maybe block?
                  // For safety, let's block if we can't find the ID
                   evt.preventDefault();
                   evt.stopPropagation();
                   alert("En feil oppstod (kunne ikke finne variant-ID). Prøv å laste siden på nytt.");
                   return;
              }

              if (this.submitButton.getAttribute('aria-disabled') === 'true') { return; }

              const sectionId = this.closest('[data-section]')?.dataset.section;
              const fileInput = sectionId ? document.getElementById(`fileUploader-${sectionId}`) : null;
              const fileErrorElement = sectionId ? document.getElementById(`fileError-${sectionId}`) : null;

              if (fileInput && fileErrorElement) {
                  // Pass the found idInput and form to the helper function
                  const validationConfig = this._getUploadValidationConfig(idInput, currentForm); 
                  let isUploadValid = true;
                  let errorMessage = '';

                  if (validationConfig) { 
                      const currentFiles = fileInput.files ? fileInput.files.length : 0;
                      console.log(`[ClickHandler] Sjekker verdier: Antall filer = ${currentFiles}, Min = ${validationConfig.min}, Max = ${validationConfig.max}`); 
                      if (currentFiles < validationConfig.min || currentFiles > validationConfig.max) {
                          isUploadValid = false;
                          errorMessage = `Du må laste opp mellom ${validationConfig.min} og ${validationConfig.max} bilder for variant "${validationConfig.value}". Du har valgt ${currentFiles}.`;
                      }
                  } else { 
                      isUploadValid = true; 
                      console.log(`[ClickHandler] Ingen spesifikk min/maks konfigurasjon funnet. Antar OK.`); 
                  }

                  if (!isUploadValid) { 
                     console.error(`*** VALIDERING FEIL: ${errorMessage} Stopper event propagation.`);
                     fileErrorElement.textContent = errorMessage;
                     fileErrorElement.style.display = 'block';
                     // ... (rest of error handling: preventDefault, stopPropagation, etc.) ...
                     evt.preventDefault(); 
                     evt.stopPropagation();
                     this.submitButton.setAttribute('aria-disabled', 'true'); 
                     setTimeout(() => { if(this.submitButton) this.submitButton.removeAttribute('aria-disabled'); }, 500); 
                     return; 
                  } else { 
                     console.log(`[ClickHandler] Validering OK (eller config manglet).`);
                     fileErrorElement.style.display = 'none';
                     console.log('[ClickHandler] Tillater click event å fortsette...');
                  }
              } else { 
                  console.warn(`[ClickHandler] Hopper over bildevalidering (fant ikke input/error-element). Tillater click event å fortsette...`); 
              }
          } 

          // --- Andre metoder ---
           handleErrorMessage(errorMessage = false) { /* ... */ }
           toggleSubmitButton(disable = true, text) { /* ... */ }
           // Getter is less critical now, but keep it for potential other uses
           get variantIdInput() { 
               if (!this._variantIdInput && !this.form) { // Ensure form exists before querying
                   this.form = this.querySelector('form');
               }
               if (!this._variantIdInput && this.form) {
                   this._variantIdInput = this.form.querySelector('[name=id]');
               }
               return this._variantIdInput;
            }

        } // End of ProductForm class
      );
    } // End of custom element definition check

    // --- DOMContentLoaded Listener ---
    // (This part remains the same - it attaches the listener correctly)
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[DOMContentLoaded] Siden er lastet. Leter etter product-form...');
        const productFormElement = document.querySelector('product-form'); 
        if (productFormElement) {
            console.log('[DOMContentLoaded] Fant product-form element:', productFormElement);
            const submitButton = productFormElement.querySelector('[type="submit"]');
            if (submitButton) {
                 if (typeof productFormElement.onButtonClickHandler === 'function') {
                    submitButton.addEventListener('click', productFormElement.onButtonClickHandler.bind(productFormElement), { capture: true });
                    console.warn('[DOMContentLoaded] La til CLICK listener på submit knapp (Capture Phase):', submitButton);
                 } else { console.error('[DOMContentLoaded] Fant IKKE onButtonClickHandler metoden!'); }
            } else { console.error('[DOMContentLoaded] Fant IKKE submit knapp!'); }
        } else { console.warn('[DOMContentLoaded] Fant IKKE <product-form> elementet.'); }
    });
    