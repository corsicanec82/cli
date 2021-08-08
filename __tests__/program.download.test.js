const os = require('os');
const path = require('path');
const git = require('isomorphic-git');
const fsp = require('fs/promises');
const fse = require('fs-extra');
const nock = require('nock');

const programCmd = require('../src/commands/program/download.js');
const initSettings = require('../src/settings.js');
const { readDirP, getFixturePath } = require('./helpers/index.js');

const getTmpDirPath = (program) => path.join(os.tmpdir(), `${program}-program`);

nock.disableNetConnect();

describe('program', () => {
  const args = {
    program: 'ruby',
    exercise: 'fundamentals',
    token: 'some-token',
  };
  let tmpDir;
  let defaults;

  beforeEach(async () => {
    tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'hexlet-cli-'));
    defaults = { homedir: tmpDir };
  });

  it('download', async () => {
    const { hexletConfigPath } = initSettings(defaults);
    const hexletDir = path.join(tmpDir, 'learning', 'Hexlet');
    const configDir = path.dirname(hexletConfigPath);
    await fse.mkdirp(hexletDir);
    await fse.mkdirp(configDir);
    const configData = await fse.readJson(getFixturePath('config.json'));
    configData.hexletDir = hexletDir;
    await fse.writeJson(hexletConfigPath, configData);

    const programArchivePath = getFixturePath('ruby-program.tar.gz');
    nock('https://hexlet-programs.fra1.digitaloceanspaces.com')
      .get('/ruby-program.tar.gz')
      .replyWithFile(200, programArchivePath);

    git.clone = jest.fn(() => {});

    await programCmd.handler(args, defaults);

    const tmpDirPath = getTmpDirPath(args.program);
    expect(await readDirP(tmpDirPath)).toMatchSnapshot();

    expect(await readDirP(hexletDir)).toMatchSnapshot();
  });

  it('download (without init)', async () => {
    await expect(programCmd.handler(args, defaults))
      .rejects.toThrow('no such file or directory');
  });

  it('download with invalid config.json', async () => {
    const { hexletConfigPath } = initSettings(defaults);
    const hexletDir = path.join(tmpDir, 'learning', 'Hexlet');
    const configDir = path.dirname(hexletConfigPath);
    await fse.mkdirp(hexletDir);
    await fse.mkdirp(configDir);
    await fse.writeJson(hexletConfigPath, {});

    await expect(programCmd.handler(args, defaults))
      .rejects.toThrow(`Validation error "${hexletConfigPath}"`);
  });
});
