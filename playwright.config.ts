// @ts-check
import { defineConfig, devices } from '@playwright/test';
//import teamsWebhook from './report/teams-webhook';

export default defineConfig({
  testDir: './spec',
  timeout: 240 * 1000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['monocart-reporter', {
      name: "NilgiriNest Automation Test Report =>",
      outputFile: './test-results/report.html',
      tags: {
        Sanity: {
            style: {
                background: '#6F9913'
            },
            description: 'This is Smoke Test'
        },
        Regression: {
            background: '#c00'
        }
    },
      visitor: (data:any, metadata:any, collect:any) => {
        const parserOptions = {
          sourceType: 'module',
           plugins: ['typescript']
        };
      },
      customFieldsInComments: true,
      onEnd: async (reportData:any, capability:any) => {
        if (process.env.CI) {
          //await teamsWebhook(reportData, capability);
        }
      }
    }]
  ],
  expect: {
    timeout: 30 * 1000,
  },
 use: {
    baseURL: 'https://quartz-sandbox.treasury-factory.com',
    browserName: "chromium",
    headless: false,
    screenshot: 'on',
    trace: "off",
    video: 'off',
    acceptDownloads: true,       
    actionTimeout: 50 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            `--download-default-directory=C:\\Users\\Nandhini.Gopal\\Downloads`,
          ]
        }
      },
    }
  ],
});