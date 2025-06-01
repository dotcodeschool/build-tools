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
const net = require("net");

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

// Function to check if a port is in use
async function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => {
      resolve(true);
    });
    server.once("listening", () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

// Function to check if a port is in use by our service
async function isPortInUseByOurService(port, serviceName) {
  try {
    const { stdout } = await execPromise(
      `docker compose -f test-compose.yml ps ${serviceName}`
    );
    if (stdout.includes(`:${port}->`)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Function to find an available port
async function findAvailablePort(startPort) {
  let port = startPort;
  while (await isPortInUse(port)) {
    port++;
  }
  return port;
}

// Function to handle port conflicts
async function handlePortConflict(service, defaultPort) {
  const portInUse = await isPortInUse(defaultPort);
  if (!portInUse) {
    return defaultPort;
  }

  // Check if the port is being used by our own service
  const isOurService = await isPortInUseByOurService(defaultPort, service);
  if (isOurService) {
    console.log(
      chalk.green(
        `\n${EMOJIS.INFO} Port ${defaultPort} is already in use by our ${service} service`
      )
    );
    return defaultPort;
  }

  console.log(
    chalk.yellow(
      `\n${EMOJIS.WARN} Port ${defaultPort} is already in use by another service`
    )
  );

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "Try another port automatically", value: "auto" },
        { name: "Specify a custom port", value: "custom" },
        { name: "Exit setup", value: "exit" },
      ],
    },
  ]);

  if (action === "exit") {
    console.log(chalk.red(`\n${EMOJIS.CROSS} Setup cancelled`));
    process.exit(1);
  }

  if (action === "custom") {
    const { port } = await inquirer.prompt([
      {
        type: "input",
        name: "port",
        message: `Enter a custom port for ${service}`,
        validate: async (input) => {
          const port = parseInt(input);
          if (isNaN(port) || port < 1 || port > 65535) {
            return "Please enter a valid port number (1-65535)";
          }
          if (await isPortInUse(port)) {
            return "This port is already in use";
          }
          return true;
        },
      },
    ]);
    return parseInt(port);
  }

  // Auto mode
  const availablePort = await findAvailablePort(defaultPort);
  console.log(
    chalk.green(`\n${EMOJIS.CHECK} Using port ${availablePort} for ${service}`)
  );
  return availablePort;
}

// Function to create test-compose.yml
async function createTestCompose(
  backendDomain,
  gitDomain,
  redisPass,
  redisUser
) {
  // Check and handle port conflicts
  const logStreamerPort = await handlePortConflict("log-streamer", 8080);
  const backendPort = await handlePortConflict("backend", 3000);
  const redisPort = await handlePortConflict("redis", 6379);
  const mongoPort = await handlePortConflict("mongodb", 27017);

  // Construct Redis URI
  const redisAuth = redisUser
    ? `${redisUser}:${redisPass}@`
    : `default:${redisPass}@`;
  const redisUri = `redis://${redisAuth}redis:6379`;

  const composeContent = `version: '3.8'

services:
  backend:
    image: iammasterbrucewayne/dcs-backend:latest
    environment:
      - BACKEND_DOMAIN=${backendDomain}
      - GIT_DOMAIN=${gitDomain}
      - REDIS_URI=${redisUri}
      - MONGODB_URI=mongodb://mongodb:${mongoPort}/dotcodeschool
      - WS_URL=ws://log-streamer:${logStreamerPort}
    ports:
      - "${backendPort}:8080"
    depends_on:
      redis:
        condition: service_healthy
      mongodb:
        condition: service_started
      log-streamer:
        condition: service_started
    networks:
      - app_network

  git-server:
    image: iammasterbrucewayne/dcs-git-server:latest
    environment:
      - GIT_DOMAIN=${gitDomain}
    ports:
      - "80:80"
      - "443:443"
      - "2222:2222"
    volumes:
      - ./git-data:/data/git
    networks:
      - app_network

  log-streamer:
    image: iammasterbrucewayne/dcs-log-streamer:latest
    environment:
      - REDIS_URL=redis://default:${redisPass}@redis:6379
    ports:
      - "${logStreamerPort}:${logStreamerPort}"
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - app_network

  redis:
    image: redis:7-alpine
    command: 
      - redis-server
      - --requirepass
      - ${redisPass}
    ports:
      - "${redisPort}:6379"
    volumes:
      - ./redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${redisPass}", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - app_network

  mongodb:
    image: mongo:6
    ports:
      - "${mongoPort}:27017"
    volumes:
      - ./mongodb-data:/data/db
    networks:
      - app_network

networks:
  app_network:
    driver: bridge
`;

  fs.writeFileSync("test-compose.yml", composeContent);
}

// Function to check if a command exists
async function checkCommand(command) {
  try {
    await execPromise(`which ${command}`);
    return true;
  } catch {
    return false;
  }
}

// Function to check dependencies
async function checkDependencies() {
  console.log(chalk.bold.blue(`\n${EMOJIS.ROCKET} Checking Dependencies\n`));

  const dockerSpinner = ora(`${EMOJIS.GEAR} Checking Docker...`).start();
  const dockerInstalled = await checkCommand("docker");
  if (!dockerInstalled) {
    dockerSpinner.fail("Docker is not installed");
    console.log(
      chalk.yellow(
        "\nPlease install Docker from: https://docs.docker.com/get-docker/"
      )
    );
    return false;
  }
  dockerSpinner.succeed("Docker is installed");

  // Check if docker compose is available
  const composeSpinner = ora(
    `${EMOJIS.GEAR} Checking Docker Compose...`
  ).start();
  try {
    await execPromise("docker compose version");
    composeSpinner.succeed("Docker Compose is available");
  } catch {
    composeSpinner.fail("Docker Compose is not available");
    console.log(
      chalk.yellow(
        "\nPlease ensure you have Docker Desktop or Docker Engine with Compose plugin installed"
      )
    );
    return false;
  }

  const curlSpinner = ora(`${EMOJIS.GEAR} Checking curl...`).start();
  const curlInstalled = await checkCommand("curl");
  if (!curlInstalled) {
    curlSpinner.fail("curl is not installed");
    console.log(
      chalk.yellow("\nPlease install curl for your operating system")
    );
    return false;
  }
  curlSpinner.succeed("curl is installed");

  return true;
}

// Function to parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--version" || arg === "-v") {
      console.log(`dotcodeschool-setup v${VERSION}`);
      process.exit(0);
    } else if (arg === "--backend-domain" || arg === "-b") {
      if (i + 1 < args.length) {
        config.backendDomain = args[++i];
      }
    } else if (arg === "--git-domain" || arg === "-g") {
      if (i + 1 < args.length) {
        config.gitDomain = args[++i];
      }
    } else if (arg === "--redis-pass" || arg === "-r") {
      if (i + 1 < args.length) {
        config.redisPass = args[++i];
      }
    } else if (arg === "--redis-user" || arg === "-u") {
      if (i + 1 < args.length) {
        config.redisUser = args[++i];
      }
    } else if (arg === "--test-runner" || arg === "-t") {
      if (i + 1 < args.length) {
        config.testRunnerUrl = args[++i];
      }
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: setup.js [options]

Options:
  -v, --version           Show version number
  -b, --backend-domain <domain>  Backend domain
  -g, --git-domain <domain>     Git server domain
  -r, --redis-pass <password>   Redis password (default: changeme)
  -u, --redis-user <username>   Redis username (optional)
  -t, --test-runner <url>       Test runner URL (optional)
  -h, --help                    Show this help message

Examples:
  # Interactive mode
  setup.js

  # Non-interactive mode
  setup.js -b api.example.com -g git.example.com -r mypassword

  # Full configuration
  setup.js -b api.example.com -g git.example.com -r mypassword -u admin -t https://test.example.com
      `);
      process.exit(0);
    }
  }

  return config;
}

// Function to set up multi-platform builder
async function setupMultiPlatformBuilder() {
  const spinner = ora("Setting up multi-platform builder...").start();
  try {
    // Check if builder exists
    const { stdout: builders } = await execPromise("docker buildx ls");
    const builderName = "multi-platform-builder";

    if (!builders.includes(builderName)) {
      // Create new builder instance
      await execPromise(
        `docker buildx create --name ${builderName} --driver docker-container --bootstrap`
      );
      spinner.succeed("Created new multi-platform builder");
    } else {
      spinner.succeed("Multi-platform builder already exists");
    }

    // Use the builder
    await execPromise(`docker buildx use ${builderName}`);
    spinner.succeed("Multi-platform builder is ready");
  } catch (error) {
    spinner.fail(`Failed to set up multi-platform builder: ${error.message}`);
    process.exit(1);
  }
}

// Function to build multi-architecture images
async function buildMultiArchImages() {
  console.log(
    chalk.bold.blue(`\n${EMOJIS.ROCKET} Building Multi-Architecture Images\n`)
  );

  // Set up multi-platform builder first
  await setupMultiPlatformBuilder();

  const buildSpinner = ora(
    "Building images for multiple architectures..."
  ).start();

  try {
    // Build backend image
    await execPromise(
      "docker buildx build --platform linux/amd64,linux/arm64 -t iammasterbrucewayne/dcs-backend:latest -t iammasterbrucewayne/dcs-backend:1.0.0 --push ../backend"
    );

    // Build git-server image
    await execPromise(
      "docker buildx build --platform linux/amd64,linux/arm64 -t iammasterbrucewayne/dcs-git-server:latest -t iammasterbrucewayne/dcs-git-server:1.0.0 --push ../git-server"
    );

    // Build log-streamer image
    await execPromise(
      "docker buildx build --platform linux/amd64,linux/arm64 -t iammasterbrucewayne/dcs-log-streamer:latest -t iammasterbrucewayne/dcs-log-streamer:1.0.0 --push ../log-streamer"
    );

    buildSpinner.succeed("Multi-architecture images built successfully");
  } catch (error) {
    buildSpinner.fail("Failed to build multi-architecture images");
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

// Main function
async function main() {
  try {
    // Check dependencies first
    const depsOk = await checkDependencies();
    if (!depsOk) {
      console.log(
        chalk.red(
          `\n${EMOJIS.CROSS} Please install the required dependencies and try again.`
        )
      );
      process.exit(1);
    }

    // Parse command line arguments
    const cliConfig = parseArgs();
    let config = {};

    // If all required arguments are provided via CLI, use them
    if (cliConfig.backendDomain && cliConfig.gitDomain) {
      config = {
        backendDomain: cliConfig.backendDomain,
        gitDomain: cliConfig.gitDomain,
        redisPass: cliConfig.redisPass || "changeme",
        redisUser: cliConfig.redisUser || "",
        testRunnerUrl: cliConfig.testRunnerUrl || "",
      };
    } else {
      // Domain Configuration
      console.log(chalk.bold.blue(`\n${EMOJIS.ROCKET} Domain Configuration\n`));
      console.log(
        chalk.gray(`${EMOJIS.INFO} Let's start by configuring your domains`)
      );

      const { backendDomain, gitDomain } = await inquirer.prompt([
        {
          type: "input",
          name: "backendDomain",
          message: `${EMOJIS.SERVER} Enter your backend domain`,
          validate: (input) => (input ? true : "This field is required"),
        },
        {
          type: "input",
          name: "gitDomain",
          message: `${EMOJIS.SERVER} Enter your git server domain`,
          validate: (input) => (input ? true : "This field is required"),
        },
      ]);

      // Redis Configuration
      console.log(chalk.bold.blue(`\n${EMOJIS.ROCKET} Redis Configuration\n`));
      console.log(chalk.gray(`${EMOJIS.INFO} Now, let's set up Redis`));

      const { redisPass, redisUser } = await inquirer.prompt([
        {
          type: "input",
          name: "redisPass",
          message: `${EMOJIS.KEY} Enter Redis password`,
          default: "changeme",
          validate: (input) => (input ? true : "This field is required"),
        },
        {
          type: "input",
          name: "redisUser",
          message: `${EMOJIS.KEY} Enter Redis username (optional)`,
          default: "",
        },
      ]);

      // Test Runner Configuration
      console.log(
        chalk.bold.blue(`\n${EMOJIS.ROCKET} Test Runner Configuration\n`)
      );
      console.log(
        chalk.gray(`${EMOJIS.INFO} Finally, let's configure the test runner`)
      );

      const { testRunnerUrl } = await inquirer.prompt([
        {
          type: "input",
          name: "testRunnerUrl",
          message: `${EMOJIS.LINK} Enter test runner URL (optional)`,
          default: "",
        },
      ]);

      config = {
        backendDomain,
        gitDomain,
        redisPass,
        redisUser,
        testRunnerUrl,
      };
    }

    // Configuration Summary
    console.log(chalk.bold.blue(`\n${EMOJIS.ROCKET} Configuration Summary\n`));
    console.log(chalk.bold("Here's what we're going to set up:\n"));
    console.log(
      `  ${chalk.gray(EMOJIS.SERVER)} Backend Domain:    ${chalk.green(
        config.backendDomain
      )}`
    );
    console.log(
      `  ${chalk.gray(EMOJIS.SERVER)} Git Server Domain: ${chalk.green(
        config.gitDomain
      )}`
    );
    console.log(
      `  ${chalk.gray(EMOJIS.KEY)} Redis Password:     ${chalk.green(
        config.redisPass
      )}`
    );
    if (config.redisUser) {
      console.log(
        `  ${chalk.gray(EMOJIS.KEY)} Redis Username:     ${chalk.green(
          config.redisUser
        )}`
      );
    }
    if (config.testRunnerUrl) {
      console.log(
        `  ${chalk.gray(EMOJIS.LINK)} Test Runner URL:    ${chalk.green(
          config.testRunnerUrl
        )}`
      );
    }

    // Only ask for confirmation in interactive mode
    if (!cliConfig.backendDomain || !cliConfig.gitDomain) {
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: "Do you want to proceed with this configuration?",
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(chalk.red(`${EMOJIS.CROSS} Setup cancelled`));
        process.exit(1);
      }
    }

    // Set environment variables
    process.env.BACKEND_DOMAIN = config.backendDomain;
    process.env.GIT_DOMAIN = config.gitDomain;
    process.env.REDIS_PASS = config.redisPass;
    process.env.REDIS_USER = config.redisUser;
    process.env.TEST_RUNNER_URL = config.testRunnerUrl;

    // Create logs directory
    execSync("mkdir -p logs");

    // Create test-compose.yml
    console.log(chalk.bold.blue(`\n${EMOJIS.ROCKET} Creating Configuration\n`));
    const composeSpinner = ora(
      "Creating docker-compose configuration..."
    ).start();
    await createTestCompose(
      config.backendDomain,
      config.gitDomain,
      config.redisPass,
      config.redisUser
    );
    composeSpinner.succeed("Configuration created");

    // Build multi-architecture images
    await buildMultiArchImages();

    // Start services
    console.log(chalk.bold.blue(`\n${EMOJIS.ROCKET} Starting Services\n`));
    const startSpinner = ora("Initializing all services...").start();
    execSync("docker compose -f test-compose.yml up -d");
    startSpinner.succeed("Services started");

    // Wait for services
    console.log(chalk.bold.blue(`\n${EMOJIS.ROCKET} Waiting for Services\n`));
    const waitSpinner = ora("Waiting for services to initialize...").start();
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Increased to 30 seconds
    waitSpinner.succeed("Services initialized");

    // Test services
    console.log(chalk.bold.blue(`\n${EMOJIS.ROCKET} Testing Services\n`));

    // Test backend
    const backendSpinner = ora(`${EMOJIS.SERVER} Testing backend...`).start();

    // First check if backend is running locally
    try {
      const backendPort = await handlePortConflict("backend", 3000);
      await execPromise(`curl -s -f http://localhost:${backendPort}/health`);
      backendSpinner.succeed("Backend is running locally");

      // Then check domain configuration
      const domainSpinner = ora(
        `${EMOJIS.SERVER} Testing domain configuration...`
      ).start();
      try {
        await execPromise(`curl -s -f https://${config.backendDomain}/health`);
        domainSpinner.succeed("Domain configuration is working");
      } catch (error) {
        domainSpinner.fail("Domain configuration is not working");
        console.log(chalk.yellow("\nThis might be due to:"));
        console.log(chalk.yellow("1. DNS not configured for the domain"));
        console.log(chalk.yellow("2. SSL/TLS not set up"));
        console.log(
          chalk.yellow("3. Caddy reverse proxy not configured correctly")
        );
      }
    } catch (error) {
      backendSpinner.fail("Backend is not responding locally");
      console.log(chalk.yellow("\nChecking backend logs..."));
      try {
        const { stdout } = await execPromise(
          "docker compose -f test-compose.yml logs backend"
        );
        console.log(chalk.gray(stdout));
      } catch (logError) {
        console.log(chalk.red("Could not fetch backend logs"));
      }
    }

    // Test git-server
    const gitSpinner = ora(`${EMOJIS.SERVER} Testing git-server...`).start();
    try {
      await execPromise(`curl -s -f http://localhost:80/api/v0/health`);
      gitSpinner.succeed("Git server is running");
    } catch (error) {
      gitSpinner.fail("Git server is not responding");
      console.log(chalk.yellow("\nChecking git-server logs..."));
      try {
        const { stdout } = await execPromise(
          "docker compose -f test-compose.yml logs git-server"
        );
        console.log(chalk.gray(stdout));
        // Check if it's an SSL certificate issue
        if (stdout.includes("could not get certificate from issuer")) {
          console.log(
            chalk.yellow(
              "\nNote: SSL certificate errors are expected in local development."
            )
          );
          console.log(
            chalk.yellow(
              "The git server is running but cannot obtain SSL certificates."
            )
          );
          console.log(
            chalk.yellow("This is normal and won't affect local development.")
          );
        }
      } catch (logError) {
        console.log(chalk.red("Could not fetch git-server logs"));
      }
    }

    // Test log-streamer
    const logSpinner = ora(`${EMOJIS.GEAR} Testing log-streamer...`).start();
    try {
      const { stdout } = await execPromise(
        "docker compose -f test-compose.yml logs log-streamer"
      );
      if (stdout.includes("started")) {
        logSpinner.succeed("Log streamer is running");
      } else {
        logSpinner.fail("Log streamer is not responding");
        console.log(chalk.yellow("\nLog streamer output:"));
        console.log(chalk.gray(stdout));
      }
    } catch (error) {
      logSpinner.fail("Log streamer is not responding");
      console.log(chalk.yellow("\nCould not fetch log-streamer logs"));
    }

    // Test Redis
    const redisSpinner = ora(`${EMOJIS.KEY} Testing Redis...`).start();
    try {
      const { stdout } = await execPromise(
        `docker compose -f test-compose.yml exec redis redis-cli -a "${config.redisPass}" ping`
      );
      if (stdout.includes("PONG")) {
        redisSpinner.succeed("Redis is running");
      } else {
        redisSpinner.fail("Redis is not responding");
        console.log(chalk.yellow("\nChecking Redis logs..."));
        try {
          const { stdout } = await execPromise(
            "docker compose -f test-compose.yml logs redis"
          );
          console.log(chalk.gray(stdout));
        } catch (logError) {
          console.log(chalk.red("Could not fetch Redis logs"));
        }
      }
    } catch (error) {
      redisSpinner.fail("Redis is not responding");
      console.log(chalk.yellow("\nChecking Redis logs..."));
      try {
        const { stdout } = await execPromise(
          "docker compose -f test-compose.yml logs redis"
        );
        console.log(chalk.gray(stdout));
      } catch (logError) {
        console.log(chalk.red("Could not fetch Redis logs"));
      }
    }

    // Setup complete
    console.log(chalk.bold.blue(`\n${EMOJIS.ROCKET} Setup Complete\n`));

    // Check if any services failed
    const allServicesRunning =
      !backendSpinner.isSpinning &&
      !gitSpinner.isSpinning &&
      !logSpinner.isSpinning &&
      !redisSpinner.isSpinning;

    if (allServicesRunning) {
      console.log(
        chalk.green(
          `${EMOJIS.CHECK} All services have been set up successfully!`
        )
      );
    } else {
      console.log(
        chalk.yellow(
          `${EMOJIS.WARN} Some services may not be running properly. Please check the logs above.`
        )
      );
    }

    console.log();
    console.log(chalk.bold.blue("Useful Commands"));
    console.log(
      `  ${chalk.gray(EMOJIS.INFO)} View logs:    ${chalk.green(
        "docker compose -f test-compose.yml logs -f"
      )}`
    );
    console.log(
      `  ${chalk.gray(EMOJIS.INFO)} Stop services: ${chalk.green(
        "docker compose -f test-compose.yml down"
      )}`
    );
    console.log();
    console.log(
      chalk.gray(
        `${EMOJIS.INFO} To save this configuration for future use, run:`
      )
    );
    console.log(
      `  ${chalk.gray(EMOJIS.GEAR)} echo 'export BACKEND_DOMAIN=${
        config.backendDomain
      }' >> ~/.bashrc`
    );
    console.log(
      `  ${chalk.gray(EMOJIS.GEAR)} echo 'export GIT_DOMAIN=${
        config.gitDomain
      }' >> ~/.bashrc`
    );
    console.log(
      `  ${chalk.gray(EMOJIS.GEAR)} echo 'export REDIS_PASS=${
        config.redisPass
      }' >> ~/.bashrc`
    );
    if (config.redisUser) {
      console.log(
        `  ${chalk.gray(EMOJIS.GEAR)} echo 'export REDIS_USER=${
          config.redisUser
        }' >> ~/.bashrc`
      );
    }
    if (config.testRunnerUrl) {
      console.log(
        `  ${chalk.gray(EMOJIS.GEAR)} echo 'export TEST_RUNNER_URL=${
          config.testRunnerUrl
        }' >> ~/.bashrc`
      );
    }
  } catch (error) {
    console.error(chalk.red(`\n${EMOJIS.CROSS} Error: ${error.message}`));
    process.exit(1);
  }
}

main();
