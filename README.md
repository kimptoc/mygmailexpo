# Welcome to your Expo app 👋

Its a simple gmail client that lists my emails in my inbox
Support google authentication and then show emails in the inbox.
You can change folder (labels).  You can move one or emails to different labels or remove the label.
It remembers most recently viewed and moved labels, putting them at the top of the list.


This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

To start the app, in your terminal run:

```bash
npm run start
```

In the output, you'll find options to open the app in:

- [a development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [an Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [an iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Workflows

This project is configured to use [EAS Workflows](https://docs.expo.dev/eas/workflows/get-started/) to automate some development and release processes. These commands are set up in [`package.json`](./package.json) and can be run using NPM scripts in your terminal.

### Previews

Run `npm run draft` to [publish a preview update](https://docs.expo.dev/eas/workflows/examples/publish-preview-update/) of your project, which can be viewed in Expo Go or in a development build.

### Development Builds

Run `npm run development-builds` to [create a development build](https://docs.expo.dev/eas/workflows/examples/create-development-builds/). Note - you'll need to follow the [Prerequisites](https://docs.expo.dev/eas/workflows/examples/create-development-builds/#prerequisites) to ensure you have the correct emulator setup on your machine.

### Production Deployments

Run `npm run deploy` to [deploy to production](https://docs.expo.dev/eas/workflows/examples/deploy-to-production/). Note - you'll need to follow the [Prerequisites](https://docs.expo.dev/eas/workflows/examples/deploy-to-production/#prerequisites) to ensure you're set up to submit to the Apple and Google stores.

## Hosting

Expo offers hosting for websites and API functions via EAS Hosting. See the [Getting Started](https://docs.expo.dev/eas/hosting/get-started/) guide to learn more.

## GitHub Pages Deployment

To deploy to GitHub Pages:

```bash
npm run deploy:web
```

This builds the web version and deploys it to the `gh-pages` branch.

### Important: Custom Deploy Script

We use a custom deploy script (`scripts/deploy-web.js`) instead of the standard `gh-pages` CLI. This is necessary because:

1. **Font files live in `dist/assets/node_modules/`**: Expo bundles icon fonts (like MaterialIcons) into `dist/assets/node_modules/@expo/vector-icons/...`

2. **The `gh-pages` npm package respects `.gitignore`**: Since `.gitignore` contains `node_modules/`, the gh-pages package excludes `dist/assets/node_modules/` from deployment, even though these are build artifacts, not actual dependencies.

3. **Missing fonts cause infinite loading**: Without the MaterialIcons font, `useFonts()` never completes, leaving the app stuck on the loading spinner.

The custom script uses git directly to copy all files from `dist/` (including `assets/node_modules/`) without any `.gitignore` filtering.

### Troubleshooting

If the deployed site shows an infinite spinner:

1. Check if font files are returning 404:
   ```bash
   curl -sI "https://kimptoc.github.io/mygmailexpo/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.4e85bc9ebe07e0340c9c4fc2f6c38908.ttf"
   ```
   Should return `HTTP/2 200`

2. Verify font exists in gh-pages branch:
   ```bash
   git fetch origin gh-pages && git ls-tree -r origin/gh-pages --name-only | grep MaterialIcons
   ```

3. If missing, re-run `npm run deploy:web` and check the script output confirms "Font directory exists"


## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
