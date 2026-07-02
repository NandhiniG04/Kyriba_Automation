Here is the fully formatted, professional README text based exactly on your workflow and setup steps. You can copy this directly and paste it into your `README.md` file.

### **How to Update Your README**

1. Open `README.md` in VS Code.
2. Delete everything currently in there.
3. Paste the text below.
4. Save the file, then run:
* `git add README.md`
* `git commit -m "Updated README with clear user instructions"`
* `git push`



---

```markdown
# Kyriba UI Automation (Nilgiri)

This repository contains a desktop application (Nilgiri) built to automate UI interactions within the Kyriba application. By automating the data entry and validation process, this tool significantly reduces human effort and minimizes manual errors.

## 🚀 How It Works

Once the application is launched, the automation follows this workflow:
* **Upload:** The user uploads an Excel file containing transaction details into the Nilgiri UI.
* **Process:** Upon starting the automation, the script iterates through each transaction in the Excel file.
* **Automate:** It automatically interacts with the Kyriba UI to fill in details, select dropdowns, and click radio buttons and launch the batch process.
* **Extract:** It downloads the payment folder, extracts the payment XML file, and saves it to a local directory.
* **Validate:** It opens a secondary Validation UI to verify the extracted XML file.
* **Report:** Finally, it writes the validation results directly back into the original Excel file.

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed on your system:
* [Node.js](https://nodejs.org/) (Required to run npm commands)

---

## 💻 Setup & Installation Instructions

Follow these steps to clone the project, install the required packages, and build the application.

**1. Clone the repository**
```bash
git clone [https://github.com/NandhiniG04/Kyriba_Automation.git](https://github.com/NandhiniG04/Kyriba_Automation.git)

```

**2. Navigate to the project directory**

```bash
cd Kyriba_Automation

```

**3. Install standard node packages**
This command installs all the core dependencies required by the project.

```bash
npm i

```

**4. Install Electron Builder**
This package is specifically required to bundle and package the Electron desktop application.

```bash
npm install electron-builder --save-dev

```

**5. Build the application**
This command bundles the code and generates the final, runnable application.

```bash
npm run build

```

---

## ▶️ Running the Application

Once the build process is complete, follow these steps to use the automation tool:

1. Open your project folder and locate the newly generated **`dist`** folder.
2. Open the `dist` folder.
3. Find the executable application file named **`nilgiri`**.
4. Double-click the file to start the app.
5. Upload your Excel sheet using the UI and click start to begin the automation!

```

```