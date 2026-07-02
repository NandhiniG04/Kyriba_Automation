import { Page } from "@playwright/test";
import { TransactionRecord } from "../types/interface";

export class TransferPage {
    constructor(private page: Page) { }

    async fillTransferDetails(baseURL: string, record: TransactionRecord) {
        // ==========================================
        // SMART SESSION RECOVERY
        // ==========================================
        const currentUrl = this.page.url();

        // If we got kicked out to the login page (or the URL implies it)
        if (currentUrl.includes('login') || await this.page.getByRole('textbox', { name: 'Username' }).isVisible({ timeout: 2000 })) {
            console.log("Session expired detected inside TransferPage. Re-authenticating...");

            await this.page.getByRole('textbox', { name: 'Username' }).click();
            await this.page.getByRole('textbox', { name: 'Username' }).fill('KUMARA');

            await this.page.getByRole('textbox', { name: 'Customer Code' }).click();
            await this.page.getByRole('textbox', { name: 'Customer Code' }).fill('INFORMA');

            await this.page.getByRole('textbox', { name: 'Password' }).click();
            await this.page.getByRole('textbox', { name: 'Password' }).fill('Balaji@9020');

            await this.page.getByRole('button', { name: 'Log In' }).click();

            console.log("Waiting for manual OTP entry... Please enter OTP.");
            // Wait for the Submit button to appear, giving you time to enter the OTP
            const submitBtn = this.page.getByRole('button', { name: 'Submit' });
            await submitBtn.waitFor({ state: 'visible', timeout: 60000 }); // 60 seconds to enter OTP
            await submitBtn.click();

            await this.page.waitForLoadState('networkidle');
            console.log("Re-authentication successful. Resuming transfer...");
        }
        // ==========================================

        const getExcelValue = (targetName: string) => {
            const cleanTarget = targetName.toLowerCase().replace(/\s+/g, '');
            for (const key in record) {
                if (key.toLowerCase().replace(/\s+/g, '') === cleanTarget) {
                    const val = String(record[key]);
                    return (val === 'undefined' || val === 'null') ? '' : val.trim();
                }
            }
            return '';
        };

        const transferType = getExcelValue('Transfer');
        const txnCode = getExcelValue('Transaction code');
        const debitAccount = getExcelValue('Debit account');

        const thirdPartyName = getExcelValue('Name');
        const idType = getExcelValue('Identifier type');
        const idValue = getExcelValue('Identifier value');
        const street1 = getExcelValue('Street 1');
        const street2 = getExcelValue('Street 2');
        const city = getExcelValue('City');
        const zipCode = getExcelValue('ZIP code');
        const stateCode = getExcelValue('State');
        const countryCode = getExcelValue('Country code');

        const bankName = getExcelValue('Bank name');
        const bicCode = getExcelValue('BIC code');
        const bankIdType = getExcelValue('Bank Identifier Type');
        const bankIdValue = getExcelValue('Bank Identifier Value');
        const bankStreet1 = getExcelValue('Bank Street 1');
        const bankStreet2 = getExcelValue('Bank Street 2');
        const bankCity = getExcelValue('Bank City');
        const bankZipCode = getExcelValue('Bank ZIP code');
        const bankStateCode = getExcelValue('Bank State');
        const bankCountryCode = getExcelValue('Bank Country code');

        let currency = getExcelValue('Amount Currency');
        if (!currency) currency = getExcelValue('Currency');

        const banType = getExcelValue('BAN type');
        const accountNum = getExcelValue('Account');
        const amount = getExcelValue('Amount');
        const economicReason = getExcelValue('Economic reason');

        await this.page.goto(baseURL + '/');
        await this.page.getByText('Payment').click();
        await this.page.getByRole('menu', { name: 'Payments/Direct Debits' }).click();
        await this.page.getByRole('menu', { name: 'Add' }).click();
        await this.page.getByRole('link', { name: 'TRANSFER' }).click();

        await this.page.getByText(transferType, { exact: true }).click();
        await this.page.getByRole('button', { name: 'Go' }).click();
        await this.page.waitForLoadState('networkidle');

        // --- 1. Issuer / Beneficiary Section ---
        await this.page.getByRole('textbox').first().click();
        await this.page.getByRole('textbox').first().pressSequentially(txnCode, { delay: 250 });
        await this.page.waitForTimeout(2000);
        await this.page.getByRole('cell', { name: txnCode, exact: true }).first().click();

        await this.page.locator('[id="participantPanel$debitAccountSelector"] > .field').first().click();
        await this.page.locator('[id="participantPanel$debitAccountSelector"] > .field').first().pressSequentially(debitAccount, { delay: 250 });
        await this.page.waitForTimeout(2000);
        await this.page.getByRole('menuitem').filter({ hasText: debitAccount }).first().click();

        await this.page.getByRole('checkbox', { name: 'One-time third party' }).check();
        await this.page.getByRole('button', { name: 'Set-up one-time third party' }).click();

        if (countryCode !== '') {
            const countryLoc = this.page.locator('[id="thirdPartyAddressControl$country"] > .field');
            await countryLoc.click();
            await countryLoc.pressSequentially(countryCode, { delay: 250 });
            await this.page.waitForTimeout(2000);
            await this.page.getByRole('cell', { name: countryCode, exact: true }).first().click();
            await this.page.waitForTimeout(1000);
        }

        await this.page.locator('#nameTextField').getByRole('textbox').click();
        await this.page.locator('#nameTextField').getByRole('textbox').fill(thirdPartyName);

        if (idType !== '' && idType.toLowerCase() !== 'none') {
            const idDropdownArrow = this.page.locator('div:nth-child(5) > .gwt-Label').first();
            if (await idDropdownArrow.isVisible({ timeout: 2000 })) {
                await idDropdownArrow.click();
                await this.page.waitForTimeout(500);
                await this.page.getByRole('option', { name: idType, exact: true }).click();
            }
        }

        if (idValue !== '') {
            const idValLocator = this.page.locator('#identifierValueTextField').getByRole('textbox');
            await idValLocator.click();
            await idValLocator.press('ControlOrMeta+a');
            await idValLocator.press('Backspace');
            await idValLocator.fill(idValue);
        }

        if (street1 !== '') {
            await this.page.locator('[id="thirdPartyAddressControl$street1"]').getByRole('textbox').click();
            await this.page.locator('[id="thirdPartyAddressControl$street1"]').getByRole('textbox').fill(street1);
        }

        if (street2 !== '') {
            await this.page.locator('[id="thirdPartyAddressControl$street2"] > .field').click();
            await this.page.locator('[id="thirdPartyAddressControl$street2"] > .field').fill(street2);
        }

        if (city !== '') {
            await this.page.locator('[id="thirdPartyAddressControl$city"] > .field').click();
            await this.page.locator('[id="thirdPartyAddressControl$city"] > .field').fill(city);
        }

        if (zipCode !== '') {
            await this.page.locator('[id="thirdPartyAddressControl$zipCode"] > .field').click();
            await this.page.locator('[id="thirdPartyAddressControl$zipCode"] > .field').fill(zipCode);
        }

        if (stateCode !== '') {
            await this.page.locator('[id="thirdPartyAddressControl$provinceCode"] > .field').click();
            await this.page.locator('[id="thirdPartyAddressControl$provinceCode"] > .field').fill(stateCode);
        }

        // --- 3. Third Party Bank Data Tab Section ---
        await this.page.getByRole('tab', { name: 'Third party Bank data' }).click();
        await this.page.waitForTimeout(1000);

        if (bankCountryCode !== '') {
            const bCountryLoc = this.page.locator('[id="bankAddressControl$country"] > .field');
            await bCountryLoc.click();
            await bCountryLoc.pressSequentially(bankCountryCode, { delay: 250 });
            await this.page.waitForTimeout(2000);
            await this.page.getByRole('cell', { name: bankCountryCode, exact: true }).first().click();
            await this.page.waitForTimeout(2000);
        }

        if (bankName !== '') {
            await this.page.locator('#bankDescriptionTextField > .field').click();
            await this.page.locator('#bankDescriptionTextField > .field').fill(bankName);
        }

        if (bankIdType !== '' && bankIdType.toLowerCase() !== 'none') {
            const bankIdDropdownArrow = this.page.locator('#bankIdentifierTypeComboBox > .combobox-labelPanel > div:nth-child(5) > .gwt-Label');
            if (await bankIdDropdownArrow.isVisible({ timeout: 2000 })) {
                await bankIdDropdownArrow.click();
                await this.page.waitForTimeout(500);
                await this.page.getByRole('option', { name: bankIdType, exact: true }).click();
            }
        }

        if (bankIdValue !== '') {
            const bankIdField = this.page.locator('#bankIdentifierValueTextField > .field').first();
            await bankIdField.click();
            await bankIdField.fill(bankIdValue);
            await bankIdField.press('Tab'); // Trigger UI update
            await this.page.waitForTimeout(500);
        }

        if (bicCode !== '') {
            const bicField = this.page.locator('#bicCodeTextField > .field').first();
            await bicField.click();
            await bicField.press('ControlOrMeta+a');
            await bicField.press('Backspace');
            await bicField.pressSequentially(bicCode, { delay: 150 });
            await bicField.press('Tab');
            await this.page.waitForTimeout(1000);
        }

        if (bankStreet1 !== '') {
            await this.page.locator('[id="bankAddressControl$street1"] > .field').click();
            await this.page.locator('[id="bankAddressControl$street1"] > .field').fill(bankStreet1);
        }

        if (bankStreet2 !== '') {
            await this.page.locator('[id="bankAddressControl$street2"] > .field').click();
            await this.page.locator('[id="bankAddressControl$street2"] > .field').fill(bankStreet2);
        }

        if (bankCity !== '') {
            await this.page.locator('[id="bankAddressControl$city"] > .field').click();
            await this.page.locator('[id="bankAddressControl$city"] > .field').fill(bankCity);
        }

        if (bankZipCode !== '') {
            await this.page.locator('[id="bankAddressControl$zipCode"] > .field').click();
            await this.page.locator('[id="bankAddressControl$zipCode"] > .field').fill(bankZipCode);
        }

        if (bankStateCode !== '') {
            await this.page.locator('[id="bankAddressControl$provinceCode"] > .field').click();
            await this.page.locator('[id="bankAddressControl$provinceCode"] > .field').fill(bankStateCode);
        }

        if (currency !== '') {
            const bankCurrLoc = this.page.locator('#currencySelector > .field');
            if (await bankCurrLoc.isVisible({ timeout: 2000 })) {
                // Try to click and type
                await bankCurrLoc.click({ force: true });
                await bankCurrLoc.pressSequentially(currency, { delay: 250 });
                await this.page.waitForTimeout(1500);

                // If the dropdown appears, click it. If not, the field is locked.
                const bankCurrCell = this.page.getByRole('cell', { name: currency, exact: true }).first();
                if (await bankCurrCell.isVisible({ timeout: 2000 })) {
                    await bankCurrCell.click();
                } else {
                    console.log(`Bank Tab: Default currency locked. Leaving as is.`);
                    await this.page.keyboard.press('Tab');
                }
            }
        }

        if (banType !== '') {
            const banDropdownArrow = this.page.locator('[id="bankAccountIdControl$banStructure"]').locator('.gwt-Label').last();
            if (await banDropdownArrow.isVisible({ timeout: 2000 })) {
                await banDropdownArrow.click();
                await this.page.waitForTimeout(500);
                await this.page.getByRole('option', { name: banType, exact: true }).click();
                await this.page.waitForTimeout(1000);
            }
        }

        if (accountNum !== '') {
            let remainingAccount = String(accountNum).replace(/\s+/g, '');

            if (banType.toUpperCase() === 'IBAN') {
                if (remainingAccount.length > 4) {
                    const ikValue = remainingAccount.substring(2, 4);
                    remainingAccount = remainingAccount.substring(4);

                    const ikInput = this.page.locator('[id="bankAccountIdControl$controlKeyTextField"] > .field').first();
                    if (await ikInput.isVisible({ timeout: 2000 })) {
                        await ikInput.click();
                        await ikInput.fill(ikValue);
                    }
                }
            }

            let boxIndex = 0;
            let fieldFoundAndVisible = true;

            while (fieldFoundAndVisible && remainingAccount.length > 0) {
                const accountField = this.page.locator(`[id="bankAccountIdControl$number${boxIndex}"] > .field`).first();

                if (await accountField.isVisible()) {
                    const nextField = this.page.locator(`[id="bankAccountIdControl$number${boxIndex + 1}"] > .field`).first();
                    const hasNextBox = await nextField.isVisible();

                    let chunkToType = "";

                    if (hasNextBox) {
                        const defaultValue = await accountField.inputValue();
                        const requiredLength = defaultValue.trim().length;

                        if (requiredLength > 0) {
                            chunkToType = remainingAccount.substring(0, requiredLength);
                            remainingAccount = remainingAccount.substring(requiredLength);
                        } else {
                            chunkToType = remainingAccount.substring(0, 1);
                            remainingAccount = remainingAccount.substring(1);
                        }
                    } else {
                        chunkToType = remainingAccount;
                        remainingAccount = "";
                    }

                    if (chunkToType !== "") {
                        await accountField.scrollIntoViewIfNeeded();
                        await accountField.click({ force: true });
                        await this.page.waitForTimeout(300);

                        await accountField.press('ControlOrMeta+a');
                        await accountField.press('Backspace');
                        await accountField.fill(chunkToType);
                    }

                    boxIndex++;
                } else {
                    fieldFoundAndVisible = false;
                }
            }
        }

        const okBtn = this.page.getByRole('button', { name: 'Ok' });
        if (await okBtn.isVisible({ timeout: 1000 })) {
            await okBtn.click();
        }

        await this.page.getByRole('button', { name: 'Save' }).click();
        await this.page.waitForLoadState('networkidle');

        // ==========================================
        // 4. STATEMENT TAB 
        // ==========================================
        await this.page.getByRole('tab', { name: 'Statement' }).click();
        await this.page.waitForTimeout(1500);

        let copiedExpandedReason = economicReason;

        if (economicReason !== '') {
            const economicField = this.page.locator('[id="statementPanel$economicTypeSelector"] > .field').first();
            await economicField.scrollIntoViewIfNeeded();
            await economicField.click();
            await economicField.press('ControlOrMeta+a');
            await economicField.press('Backspace');
            await economicField.pressSequentially(economicReason, { delay: 250 });
            await this.page.waitForTimeout(2000);

            const economicCell = this.page.getByRole('cell', { name: economicReason, exact: true }).filter({ visible: true }).first();
            if (await economicCell.isVisible({ timeout: 3000 })) {
                await economicCell.click();
            } else {
                await economicField.press('Enter');
                await economicField.press('Tab');
            }

            await this.page.waitForTimeout(1000);

            const descrLocator = this.page.locator('[id="statementPanel$economicTypeDescr"]');
            if (await descrLocator.isVisible({ timeout: 2000 })) {
                const inputVal = await descrLocator.inputValue();

                if (inputVal && inputVal.trim() !== '') {
                    copiedExpandedReason = inputVal;
                }
            }
        }

        // ==========================================
        // 5. INSTRUCTIONS TAB 
        // ==========================================
        await this.page.getByRole('tab', { name: 'Instructions' }).click();
        await this.page.waitForTimeout(1000);

        if (currency !== '') {
            const instCurrencyField = this.page.locator('[id$="amountAmountControl$inner_code"]').first();
            if (await instCurrencyField.isVisible({ timeout: 2000 })) {
                // Try to click and type
                await instCurrencyField.click({ force: true });
                await instCurrencyField.pressSequentially(currency, { delay: 300 });
                await this.page.waitForTimeout(1500);

                // If the dropdown appears, click it. If not, the field is locked.
                const instCurrCell = this.page.getByRole('cell', { name: currency, exact: true }).first();
                if (await instCurrCell.isVisible({ timeout: 2000 })) {
                    await instCurrCell.click();
                } else {
                    console.log(`Instructions Tab: Default currency locked. Leaving as is.`);
                    await this.page.keyboard.press('Tab');
                }
            }
        }

        if (amount !== '') {
            const amountField = this.page.locator('.field.numberField').first();
            await amountField.click();
            await amountField.fill(amount);
            await this.page.keyboard.press('Tab');
        }

        if (copiedExpandedReason !== '') {
            const reasonLocator = this.page.locator('[id="definitionPanel$reasonTextField"] > .field').first();
            if (await reasonLocator.isVisible()) {
                await reasonLocator.click({ force: true });
                await reasonLocator.fill(copiedExpandedReason);
            }
        }

        // --- 6. USER ZONES TAB ---
        await this.page.getByRole('tab', { name: 'User zones' }).click();

        const userZone0 = this.page.locator('[id$="userZone0$userZone0InnerControl"] > .field').first();
        await userZone0.scrollIntoViewIfNeeded();
        await userZone0.waitFor({ state: 'visible', timeout: 5000 });
        await userZone0.click({ force: true });
        await userZone0.pressSequentially('NA', { delay: 250 });

        const firstOption = this.page.getByText('Not Applicable', { exact: true }).filter({ visible: true });
        await firstOption.waitFor({ state: 'visible', timeout: 5000 });
        await firstOption.click();

        const userZone1 = this.page.locator('[id$="userZone1$userZone1InnerControl"] > .field').first();
        await userZone1.scrollIntoViewIfNeeded();
        await userZone1.waitFor({ state: 'visible', timeout: 5000 });
        await userZone1.click({ force: true });
        await userZone1.pressSequentially('NA', { delay: 250 });

        const secondOption = this.page.getByText('Not Applicable', { exact: true }).filter({ visible: true });
        await secondOption.waitFor({ state: 'visible', timeout: 5000 });
        await secondOption.click();

        await this.page.locator('#btnSave').click();
        await this.page.waitForLoadState('networkidle');
    }
}