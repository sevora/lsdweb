# lsdweb
## Overview
This is an OpenAI page generator. Originally from [Express + Typescript Server Template](https://github.com/sevora/express-server-template.git).

## Commands
These commands are expected to be ran on the root directory of the project.
- `npm run dev` is the command to run the TypeScript source code directly in Node environment.
- `npm run build` is the command to transpile the server code into JavaScript in the build folder.
- `npm start` is the command to run the transpiled code in the build folder through Node.
  
In a production environment, one would normally use a method other than `npm start` through packages such as pm2 or nodemon.

## Configuration
- `types/index.d.ts` is the file where you can extend the Express Request object.
- `environment.d.ts` is the file where you can define the environment variables type definitions.

It is imporant to define the environment variables. Failure to do so may result in unexpected errors and crashes. Here is an example of `.env` file that you may place within the root directory of this project:
```env
RESULTS_MAX_FILES=1000
RESULTS_HISTORY_PAGE_SIZE=10
RESULTS_CLEANUP_INTERVAL=60000
PORT=8000
```

## AWS EC2 Deployment Guide
This is mainly intended for a quick and easy setup when deploying using AWS EC2 instances with an AMI 2023. 

This guide does not talk about how to use custom domains. However, if you're using [Amazon Route 53](https://aws.amazon.com/route53/), you'd want to use an EC2 Application Load Balancer, connected to the instance in order to use it on a hosted zone. 

### Setting up the Instance
First, access your EC2 instance through SSH. Next, we install [Node.js](https://nodejs.org/en) via [nvm](https://github.com/nvm-sh/nvm). To do so simply run the command:
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```
Which should install nvm. Then run, 
```
source ~/.bashrc
```
To ensure that the session will have the new commands. Finally run,
```
nvm install --lts
```
Which wil install the long term support version of [Node.js](https://nodejs.org/en).

For convenience, we also want to install [git](https://git-scm.com/) if it is not yet installed and to do so run:
```
sudo dnf install git
```

### Setting up the Server
First, we clone the repository inside the instance, therefore we run:
```
git clone https://github.com/sevora/express-server-template.git
```

Ofcourse, **we go inside the project directory (*cd* into it)**, then:
```
npm install
```

Then create an environment variable file specifically a `.env`. On the template `PORT` is an environment variable that may or may not be present. 

To define the `PORT`, create `.env` file on the project's root directory as follows (use any terminal text editor such as vim or nano):
```env
PORT=8000
```

### Running and Updating the Server
**All of these commands assume that the user is inside this project's directory.**

Finally, we want to run the server. Every time there is a change in the code, we want to build the project again using:
```
npm run build
```
This will generate a build directory with all the transpiled code, then we can run the server in multiple ways. One of which is the simplest:
```
node ./build/index.js
```

But it could also be run in other ways such as with the use of [pm2](https://www.npmjs.com/package/pm2) which is more practical on an EC2 instance. 