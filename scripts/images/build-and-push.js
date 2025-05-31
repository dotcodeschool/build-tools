#!/usr/bin/env node

const { execSync } = require("child_process");
const inquirer = require("inquirer");
const chalk = require("chalk");
const ora = require("ora");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const fs = require("fs");
const path = require("path");

// Get version from package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "package.json"), "utf8")
);
const VERSION = packageJson.version;

// Emojis
const EMOJIS = {
  ROCKET: "🚀",
  CHECK: "✅",
  CROSS: "❌",
  GEAR: "⚙️",
  LINK: "🔗",
  KEY: "🔑",
  SERVER: "🖥️",
  INFO: "ℹ️",
  WARN: "⚠️",
};

// Docker Hub configuration
const DOCKER_USERNAME = "iammasterbrucewayne";
const DOCKER_TAG = "latest";

// Function to check if repository exists
async function checkRepo(repo) {
  const spinner = ora(`Checking repository ${repo}...`).start();
  try {
    const response = await execPromise(
      `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer ${process.env.DOCKER_TOKEN}" https://hub.docker.com/v2/repositories/${DOCKER_USERNAME}/${repo}/`
    );

    if (response.stdout === "404") {
      spinner.info(`Repository ${repo} does not exist. Creating...`);
      const createResponse = await execPromise(
        `curl -s -X POST -H "Authorization: Bearer ${process.env.DOCKER_TOKEN}" -H "Content-Type: application/json" https://hub.docker.com/v2/repositories/ -d '{"namespace":"${DOCKER_USERNAME}","name":"${repo}","is_private":false}'`
      );

      if (createResponse.stdout.includes("message")) {
        spinner.fail(`Error creating repository: ${createResponse.stdout}`);
        process.exit(1);
      }
      spinner.succeed(`Repository ${repo} created!`);
    } else if (response.stdout === "200") {
      spinner.succeed(`Repository ${repo} exists.`);
    } else {
      spinner.fail(
        `Error checking repository ${repo}. Status code: ${response.stdout}`
      );
      process.exit(1);
    }
  } catch (error) {
    spinner.fail(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Function to build and push an image
async function buildAndPush(service, context) {
  const repo = `dcs-${service}`;
  const imageName = `${DOCKER_USERNAME}/${repo}:${VERSION}`;
  const spinner = ora(`Building ${service}...`).start();

  try {
    // Check if repository exists
    await checkRepo(repo);

    // Verify Dockerfile exists
    const dockerfilePath = `${context}/Dockerfile`;
    if (!fs.existsSync(dockerfilePath)) {
      spinner.fail(`Dockerfile not found at ${dockerfilePath}`);
      process.exit(1);
    }

    // Build the image with progress
    spinner.stop();
    console.log(chalk.blue(`\n${EMOJIS.GEAR} Building ${service}...`));

    const buildProcess = exec(
      `docker build -t ${imageName} -f ${dockerfilePath} ${context}`
    );

    buildProcess.stdout.on("data", (data) => {
      // Filter and format the output
      const lines = data.toString().split("\n");
      lines.forEach((line) => {
        if (line.includes("Step")) {
          console.log(chalk.cyan(line)); // Steps in cyan
        } else if (line.includes("Pulling")) {
          console.log(chalk.blue(line)); // Changed from yellow to blue
        } else if (line.includes("Successfully")) {
          console.log(chalk.green(line));
        } else if (line.includes("Using cache")) {
          console.log(chalk.magenta(line));
        } else if (line.trim()) {
          console.log(chalk.gray(line));
        }
      });
    });

    buildProcess.stderr.on("data", (data) => {
      // Only use red for actual errors
      if (data.toString().toLowerCase().includes("error")) {
        console.error(chalk.red(data));
      } else {
        console.log(chalk.blue(data)); // Changed from yellow to blue
      }
    });

    await new Promise((resolve, reject) => {
      buildProcess.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Build failed with code ${code}`));
        }
      });
    });

    // Push the image with progress
    console.log(chalk.blue(`\n${EMOJIS.ROCKET} Pushing ${service}...`));

    const pushProcess = exec(`docker push ${imageName}`);

    pushProcess.stdout.on("data", (data) => {
      // Filter and format the output
      const lines = data.toString().split("\n");
      lines.forEach((line) => {
        if (line.includes("Pushing")) {
          console.log(chalk.cyan(line));
        } else if (line.includes("Pushed")) {
          console.log(chalk.green(line));
        } else if (line.includes("Layer")) {
          console.log(chalk.blue(line)); // Changed from yellow to blue
        } else if (line.includes("Preparing")) {
          console.log(chalk.magenta(line));
        } else if (line.trim()) {
          console.log(chalk.gray(line));
        }
      });
    });

    pushProcess.stderr.on("data", (data) => {
      // Only use red for actual errors
      if (data.toString().toLowerCase().includes("error")) {
        console.error(chalk.red(data));
      } else {
        console.log(chalk.blue(data)); // Changed from yellow to blue
      }
    });

    await new Promise((resolve, reject) => {
      pushProcess.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Push failed with code ${code}`));
        }
      });
    });

    console.log(
      chalk.green(`\n${EMOJIS.CHECK} Successfully built and pushed ${service}!`)
    );
  } catch (error) {
    console.error(chalk.red(`\n${EMOJIS.CROSS} Error: ${error.message}`));
    process.exit(1);
  }
}

// Function to parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const services = [];
  let currentService = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--version" || arg === "-v") {
      console.log(`dotcodeschool-build-images v${VERSION}`);
      process.exit(0);
    } else if (arg === "--service" || arg === "-s") {
      if (i + 1 < args.length) {
        currentService = { name: args[++i] };
        services.push(currentService);
      }
    } else if (arg === "--path" || arg === "-p") {
      if (i + 1 < args.length && currentService) {
        currentService.path = args[++i];
      }
    } else if (arg === "--token" || arg === "-t") {
      if (i + 1 < args.length) {
        process.env.DOCKER_TOKEN = args[++i];
      }
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: build-and-push.js [options]

Options:
  -v, --version           Show version number
  -s, --service <name>    Service name (can be used multiple times)
  -p, --path <path>      Path to service directory (must follow --service)
  -t, --token <token>    Docker Hub token
  -h, --help            Show this help message

Examples:
  # Interactive mode
  build-and-push.js

  # Non-interactive mode
  build-and-push.js -s backend -p /path/to/backend -s git-server -p /path/to/git-server

  # With Docker token
  build-and-push.js -t your-token -s backend -p /path/to/backend
      `);
      process.exit(0);
    }
  }

  return services;
}

// Main function
async function main() {
  console.log(chalk.blue(`\n${EMOJIS.ROCKET} Docker Build and Push Tool\n`));

  // Parse command line arguments
  const cliServices = parseArgs();
  let services = [];

  // If services were provided via CLI, use them
  if (cliServices.length > 0) {
    services = cliServices.map((s) => ({
      name: s.name,
      value: s.name,
      context: s.path,
    }));
  } else {
    // Check if DOCKER_TOKEN is set, if not ask for it
    if (!process.env.DOCKER_TOKEN) {
      console.log(
        chalk.yellow(
          `\n${EMOJIS.INFO} Docker Hub token not found in environment variables`
        )
      );

      const { dockerToken } = await inquirer.prompt([
        {
          type: "password",
          name: "dockerToken",
          message: "Enter your Docker Hub token:",
          validate: (input) => {
            if (!input.trim()) {
              return "Docker token cannot be empty";
            }
            return true;
          },
        },
      ]);

      // Set the token for this session
      process.env.DOCKER_TOKEN = dockerToken.trim();

      // Ask if user wants to save the token
      const { shouldSaveToken } = await inquirer.prompt([
        {
          type: "confirm",
          name: "shouldSaveToken",
          message: "Would you like to save this token to your environment?",
          default: false,
        },
      ]);

      if (shouldSaveToken) {
        const shell = process.env.SHELL || "bash";
        const exportCmd = `export DOCKER_TOKEN=${dockerToken.trim()}`;

        console.log(
          chalk.blue(
            `\n${EMOJIS.INFO} Add this line to your shell configuration file:`
          )
        );
        console.log(chalk.yellow(exportCmd));

        if (shell.includes("zsh")) {
          console.log(
            chalk.blue(
              `\nOr run this command to add it to your current session:`
            )
          );
          console.log(chalk.yellow(`echo '${exportCmd}' >> ~/.zshrc`));
        } else if (shell.includes("bash")) {
          console.log(
            chalk.blue(
              `\nOr run this command to add it to your current session:`
            )
          );
          console.log(chalk.yellow(`echo '${exportCmd}' >> ~/.bashrc`));
        }
      }
    }

    // Ask for services to build
    let addMore = true;

    while (addMore) {
      const { serviceName, servicePath } = await inquirer.prompt([
        {
          type: "input",
          name: "serviceName",
          message: "Enter service name (e.g., backend, git-server):",
          validate: (input) => {
            if (!input.trim()) {
              return "Service name cannot be empty";
            }
            if (services.some((s) => s.value === input.trim())) {
              return "Service name already exists";
            }
            return true;
          },
        },
        {
          type: "input",
          name: "servicePath",
          message: "Enter absolute path to service directory:",
          validate: (input) => {
            const path = input.trim();
            if (!path) {
              return "Path cannot be empty";
            }
            if (!fs.existsSync(path)) {
              return "Directory does not exist";
            }
            if (!fs.existsSync(`${path}/Dockerfile`)) {
              return "Dockerfile not found in directory";
            }
            return true;
          },
        },
      ]);

      services.push({
        name: serviceName.trim(),
        value: serviceName.trim(),
        context: servicePath.trim(),
      });

      const { shouldAddMore } = await inquirer.prompt([
        {
          type: "confirm",
          name: "shouldAddMore",
          message: "Add another service?",
          default: false,
        },
      ]);

      addMore = shouldAddMore;
    }
  }

  // If in interactive mode, ask which services to build
  let selectedServices;
  if (cliServices.length === 0) {
    const { selected } = await inquirer.prompt([
      {
        type: "checkbox",
        name: "selected",
        message: "Select services to build and push:",
        choices: services,
        validate: (input) => {
          if (input.length === 0) {
            return "Please select at least one service";
          }
          return true;
        },
      },
    ]);
    selectedServices = selected;
  } else {
    selectedServices = services.map((s) => s.value);
  }

  // Build and push selected services
  for (const service of selectedServices) {
    const serviceConfig = services.find((s) => s.value === service);
    await buildAndPush(serviceConfig.value, serviceConfig.context);
  }

  console.log(
    chalk.green(
      `\n${EMOJIS.CHECK} All selected images have been built and pushed successfully!`
    )
  );
}

// Run the main function
main().catch((error) => {
  console.error(chalk.red(`\n${EMOJIS.CROSS} Error: ${error.message}`));
  process.exit(1);
});
