import { Page } from "@playwright/test";

export class LoginPage {
    constructor(private page: Page) { }

    async performLogin(url: string) {
        await this.page.goto(url);
        await this.page.getByRole('textbox', { name: 'Username' }).click();
        await this.page.getByRole('textbox', { name: 'Username' }).fill('KUMARA');
        await this.page.getByRole('textbox', { name: 'Customer Code' }).click();
        await this.page.getByRole('textbox', { name: 'Customer Code' }).fill('INFORMA');
        await this.page.getByRole('textbox', { name: 'Password' }).click();
        await this.page.getByRole('textbox', { name: 'Password' }).fill('Balaji@9020');
        await this.page.getByRole('button', { name: 'Log In' }).click();
        await this.page.getByRole('button', { name: 'Submit' }).click();
        await this.page.waitForLoadState('networkidle');
    }
}