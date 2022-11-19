#!/usr/bin/env node
import {
  existsSync,
  readdirSync,
  mkdirSync,
  rmdirSync,
  unlinkSync,
  statSync,
  copyFileSync,
  writeFileSync
} from 'node:fs'
import { resolve, relative } from 'node:path'
import minimist from 'minimist'
import fg from 'fast-glob'
import prompts from 'prompts'
import { postOrderDirectoryTraverse } from './utils'
import ejs from 'ejs'
import { red, bold, green } from 'kolorist'
import assets from './assets.json'
import https from 'https'
import util from 'node:util'
import { exec as _exec } from 'node:child_process'

const exec = util.promisify(_exec)
interface PromptsResult {
  projectName?: string
  shouldOverwrite?: boolean
  packageName?: string
  packageManager: 'npm' | 'yarn' | 'pnpm'
  description?: string
  needsTypeScript?: boolean
  needsJsx?: boolean
  needsRouter?: boolean
  needsPinia?: boolean
  needsVitest?: boolean
  needsE2eTesting?: false | 'cypress' | 'playwright'
  needsEslint?: boolean
  needsPrettier?: boolean
  [key: string]: any
}
interface DependenciesInfo {
  name: string,
  version: string
}

const isDirEmpty = (path) => readdirSync(path).length === 0
function _rmdir(dir) {
  if (!existsSync(dir)) return
  postOrderDirectoryTraverse(
    dir,
    (dir) => rmdirSync(dir),
    (file) => unlinkSync(file)
  )
}
function ValidDirInPathExist(path) {
  const arr = path.split('\\')
  if (arr[arr.length - 1].search(/\.\S+/g)) arr.pop()
  for (let i = 2; i <= arr.length; i++) {
    const dir = arr.slice(0, i).join('\\')
    if (!existsSync(dir)) mkdirSync(dir)
  }
}
function getPackageInfo(packageName):Promise<string> {
  return new Promise((resolve, reject) => {
    const request = https.get(
      `https://api.npms.io/v2/package/${encodeURIComponent(packageName)}`,
      (res) => {
        let version = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          const match = chunk.toString().match(/"version":"(\S+)",/)
          if (match) {
            version = match[1]
            request.destroy()
          }
        })
        res.on('close', () => {
          resolve('^' + version)
        })
      }
    )
  })
}
function copyFile(src, dest) {
  const stat = statSync(src)
  if (stat.isDirectory()) {
    for (const file of readdirSync(src)) {
      copyFile(resolve(src, file), resolve(dest, file))
    }
    return
  }
  copyFileSync(src, dest)
}
async function normalizationDependencies(dependencies) {
  const result:{ dependencies:Array<DependenciesInfo>, devDependencies:Array<DependenciesInfo> } = {
    dependencies: [],
    devDependencies: []
  }
  for (let packageName in dependencies) {
    const version = await getPackageInfo(packageName)
    if (dependencies[packageName]) {
      result.dependencies.push({ name: packageName, version })
    } else {
      result.devDependencies.push({ name: packageName, version })
    }
  }
  return result
}

async function run() {
  const { stdout: pnpmStdout, stderr: pnpmStderr } = await exec('pnpm -v')
  const { stdout: yarnStdout, stderr: yarnStderr } = await exec('yarn -v')
  const cwd = process.cwd()
  // possible options:
  // --default
  // --typescript / --ts
  // --jsx
  // --router / --vue-router
  // --pinia
  // --with-tests / --tests (equals to `--vitest --cypress`)
  // --vitest
  // --cypress
  // --playwright
  // --eslint
  // --eslint-with-prettier (only support prettier through eslint for simplicity)
  // --force (for force overwriting)
  const argv = minimist(process.argv.slice(2), {
    boolean: true
  })
  let targetDir = resolve(cwd, argv._[0] || '.')
  const defaultProjectName = 'vue-project'
  const forceOverwrite = argv.force
  let result: PromptsResult
  // result = {
  //   projectName: 'vue-project',
  //   shouldOverwrite: true,
  //   description: 'init',
  //   packageName: 'vue',
  //   needsPinia: true,
  //   needsRouter: true,
  //   needsJsx: true,
  //   needsTypeScript: true,
  //   needsVitest: true,
  //   needsE2eTesting: false,
  //   needsEslint: false
  // }
  try {
    result = await prompts([
      {
        name: 'projectName',
        type: existsSync(targetDir) && isDirEmpty(targetDir) ? null : 'text',
        message: 'Project name:',
        initial: defaultProjectName,
        onState: (state) => (String(state.value).trim())
      },
      {
        name: 'shouldOverwrite',
        type: () => isDirEmpty(targetDir) || forceOverwrite ? null : 'confirm',
        message: () => {
          const dirForPrompt = targetDir === cwd ? 'Current directory' : `Target directory "${targetDir}"`
          return `${dirForPrompt} is not empty. Remove existing files and continue?`
        }
      },
      {
        name: 'packageName',
        type: 'text',
        message: 'package name:',
        initial: defaultProjectName,
        onState: (state) => (String(state.value).trim())
      },
      {
        name: 'packageManager',
        type: 'select',
        message: 'select packageManager',
        initial: 0,
        choices: () => [
          { title: 'npm', value: 'npm', description: 'npm package manager' },
          { title: 'yarn', value: 'yarn', description: `${yarnStdout ? 'yarn package manager' : 'uninstalled yarn package manager'}`, disabled: !yarnStdout },
          { title: 'pnpm', value: 'pnpm', description: `${pnpmStdout ? 'pnpm package manager' : 'uninstalled pnpm package manager'}`, disabled: !pnpmStdout }
        ]
      },
      {
        name: 'description',
        type: 'text',
        message: 'description:',
      },
      {
        name: 'needsTypeScript',
        type: 'toggle',
        message: 'Add TypeScript?',
        initial: false,
        active: 'Yes',
        inactive: 'No'
      },
      {
        name: 'needsJsx',
        type: () => (argv.jsx ? null : 'toggle'),
        message: 'Add JSX Support?',
        initial: false,
        active: 'Yes',
        inactive: 'No'
      },
      {
        name: 'needsRouter',
        type: () => (argv.router ? null : 'toggle'),
        message: 'Add Vue Router for Single Page Application development?',
        initial: false,
        active: 'Yes',
        inactive: 'No'
      },
      {
        name: 'needsPinia',
        type: () => (argv.pinia ? null : 'toggle'),
        message: 'Add Vue Router for Single Page Application development?',
        initial: false,
        active: 'Yes',
        inactive: 'No'
      },
      {
        name: 'needsVitest',
        type: () => (argv.tests || argv.vitest ? null : 'toggle'),
        message: 'Add Vitest for Unit Testing?',
        initial: false,
        active: 'Yes',
        inactive: 'No'
      },
      {
        name: 'needsE2eTesting',
        type: () => (argv.tests || argv.cypress || argv.playwright ? null : 'select'),
        message: 'Add an End-to-End Testing Solution?',
        initial: 0,
        choices: (prev, answers) => [
          { title: 'No', value: false },
          {
            title: 'Cypress',
            description: answers.needsVitest
              ? undefined
              : 'also supports unit testing with Cypress Component Testing',
            value: 'cypress'
          },
          {
            title: 'Playwright',
            value: 'playwright'
          }
        ]
      },
      {
        name: 'needsEslint',
        type: () => (argv.eslint ? null : 'toggle'),
        message: 'Add ESLint for code quality?',
        initial: false,
        active: 'Yes',
        inactive: 'No'
      },
      {
        name: 'needsPrettier',
        type: (prev, values) => {
          if (argv.prettier || !values.needsEslint) {
            return null
          }
          return 'toggle'
        },
        message: 'Add Prettier for code formatting?',
        initial: false,
        active: 'Yes',
        inactive: 'No'
      }
    ], {
      onCancel: () => {
        throw new Error(red('✖') + ' Operation cancelled')
      }
    })
  } catch (error) {
    console.log(error.message)
    process.exit(1)
  }

  result.needsCypress = argv.cypress || result.needsE2eTesting === 'cypress'
  result.needsCypressCT = result.needsCypress && !result.needsVitest
  result.needsPlaywright = argv.playwright || result.needsE2eTesting === 'playwright'
  const isTargetDirEmpty = existsSync(targetDir) && isDirEmpty(targetDir)
  const shouldOverwrite = forceOverwrite || result.shouldOverwrite
  const projectSyntaxSuffix = result.needsTypeScript ? '.ts' : '.js'
  const globs: Array<[]> = [assets.base.glob as []]
  const dependencies = await normalizationDependencies(assets.base.isDependencies)
  const data = Object.assign(Object.create(null), result, {package: dependencies}, {scripts: assets.base.scripts})
  for (let key in result) {
    const lowerCaseKey = key.toLowerCase()
    for (let assetKey in assets) {
      if (lowerCaseKey.includes(assetKey) && result[key]) {
        const item = assets[assetKey]
        globs.push(item.glob)
        if (item.scripts) data.scripts.push(...item.scripts)
        const dependencies = await normalizationDependencies(item.isDependencies)
        data.package.dependencies.push(...dependencies.dependencies)
        data.package.devDependencies.push(...dependencies.devDependencies)
      }
    }
  }
  // @ts-ignore
  if (!result.needsVitest) globs.push(['!templates/src/components/__tests__/'])
  // @ts-ignore
  const matchPath = await fg(globs.flat(Infinity).filter(Boolean), { cwd: __dirname, dot: true })
  if (!isTargetDirEmpty && shouldOverwrite) _rmdir(targetDir)
  targetDir = resolve(targetDir, './' + (result.projectName ?? ''))
  if (!existsSync(targetDir)) ValidDirInPathExist(targetDir)
  matchPath.forEach(async (path: string) => {
    const normalizationPath = resolve(__dirname, path)
    const targetPath = resolve(targetDir, path.replace('templates', '.'))
    ValidDirInPathExist(targetPath)
    if (normalizationPath.endsWith('.ejs')) {
      const res = await ejs.renderFile(normalizationPath, data)
      writeFileSync(
        targetPath.replace(/(\.\S+)?(\.\S+)/g, (match, p1, p2) => {
          if (p1 && p2) {
            return p1
          } else {
            return p2 != '.ejs' ? p1 : projectSyntaxSuffix
          }
        }),
        res
      )
    } else {
      copyFile(normalizationPath, targetPath)
    }
  })

  console.log(`\nDone. Now run:\n`)

  if (targetDir !== cwd) console.log(`  ${bold(green(`cd ${relative(cwd, targetDir)}`))}`)
  console.log(`  ${bold(green(`${ result.packageManager } install`))}`)
  console.log(`  ${bold(green( `${ result.packageManager } dev`))}`)
  console.log()
}
run()
