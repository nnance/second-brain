import { execSync } from "node:child_process";

interface ServiceStatus {
  running: boolean;
  pid?: number;
  label: string;
  uptime?: string;
}

function getServiceStatus(): ServiceStatus {
  const label = "com.second-brain.agent";
  const status: ServiceStatus = { running: false, label };

  try {
    // Check launchctl list for our service
    const output = execSync(`launchctl list | grep ${label}`, {
      encoding: "utf-8",
    });

    // Output format: PID Status Label
    // e.g., "1234  0  com.second-brain.agent"
    const parts = output.trim().split(/\s+/);
    const pid = Number.parseInt(parts[0]);

    if (!Number.isNaN(pid) && pid > 0) {
      status.running = true;
      status.pid = pid;

      // Get process start time for uptime
      try {
        const psOutput = execSync(`ps -p ${pid} -o etime=`, {
          encoding: "utf-8",
        });
        status.uptime = psOutput.trim();
      } catch {
        // Process might have just started
      }
    }
  } catch {
    // Service not found in launchctl list
  }

  return status;
}

function main(): void {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes("--json");

  const status = getServiceStatus();

  if (jsonOutput) {
    console.log(JSON.stringify(status, null, 2));
  } else {
    console.log("Second Brain Service Status");
    console.log("============================");
    console.log();

    if (status.running) {
      console.log("Status: Running");
      console.log(`PID: ${status.pid}`);
      if (status.uptime) {
        console.log(`Uptime: ${status.uptime}`);
      }
    } else {
      console.log("Status: Stopped");
    }
  }

  process.exit(status.running ? 0 : 1);
}

main();
