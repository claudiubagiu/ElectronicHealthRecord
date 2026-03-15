const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment of PatientRecords...");

  // Obține contractul
  const PatientRecords = await hre.ethers.getContractFactory("PatientRecords");

  console.log("📝 Deploying contract...");
  const patientRecords = await PatientRecords.deploy();

  await patientRecords.waitForDeployment();

  const address = await patientRecords.getAddress();

  console.log("✅ PatientRecords deployed to:", address);
  console.log("🔗 Network:", hre.network.name);
  console.log("⛓️  Chain ID:", hre.network.config.chainId);
}

main()
  .then(() => {
    console.log("✅ Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
