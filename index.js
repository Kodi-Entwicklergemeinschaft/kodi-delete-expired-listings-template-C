const { Service } = require("utils-heidi");
require("dotenv").config();
const { processInput } = require("./processInput");

async function main() {
  let date = new Date()
  let startTime = date.toISOString().slice(0,10) + " " + date.toLocaleString("CET", {hour: '2-digit', hour12: false,  minute:'2-digit', second:'2-digit'})

  console.log("Started service at " + startTime);
  const serviceId = 1;

  let service = new Service(
    process.env.DATABASE_HOST,
    process.env.DATABASE_USER,
    process.env.DATABASE_PASSWORD,
    process.env.DATABASE_NAME,
    process.env.DATABASE_PORT,
    serviceId
  );

  try {
    let inputs = await service.getInputs(process.env.BATCH_SIZE);
    while(inputs && inputs.length > 0) {
      const tasks = []; //add tasks here
      for (const input of inputs)
      {
        tasks.push(processInput(input, service))
      }
      try {
        var responses = await Promise.all(tasks)
        if (responses.includes(false)) {
          console.log("Stopped Delete Listings Service");
          break;
        }
      } catch (error) {
        console.error(error);
      }
      inputs = await service.getInputs(process.env.BATCH_SIZE)
    }
  } catch (error) {
    console.error(error);
  }
}

main()
  .then((r) => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
