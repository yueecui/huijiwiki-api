import { HuijiWiki } from './HuijiWiki/HuijiWiki';
import { TESTBOT_PASSWORD, TESTBOT_USERNAME } from './secret';

export const WORKSPACE_PATH = 'D:\\StarRail\\starrail-wiki-workspace';
export const DATA_OUTPUT_PATH = `${WORKSPACE_PATH}\\data\\wiki`;
export const SQLITE_PATH = `${WORKSPACE_PATH}\\wikitext.sqlite`;
export const UPLOAD_PATH = `${WORKSPACE_PATH}\\image\\output`;

async function upload(wiki: HuijiWiki, fileName: string) {
    const filePath = `${UPLOAD_PATH}\\${fileName}`;
    const result = await wiki.uploadImage(filePath, fileName);
    if (result.error && result.error.code != 'fileexists-no-change') {
        console.log(`上传失败：${fileName}，错误信息：${result.error.info}`);
        console.log(result);
        throw new Error('上传失败！');
    } else {
        console.log(`上传成功：${fileName}`);
        // 移除文件
        // fs.unlinkSync(filePath);
    }
}

async function tryTest() {
    // HuijiTabx.newFromXlsxFile('D:\\GBF\\workspace\\excel\\羁绊奖励.xlsx');

    // const wiki = new HuijiWiki(WIKI_PREFIX, { sqlitePath: SQLITE_PATH });
    const wiki = new HuijiWiki('danteng', 'EbKKuHMf3CWPQo');
    if (!(await wiki.apiLogin(TESTBOT_USERNAME, TESTBOT_PASSWORD))) {
        throw new Error('登录失败！');
    }
    console.log('登录成功，开始测试编辑');

    const result = await wiki.editPage('AAAA', 'dddd');
    // console.log(result);
    // const pq = new PQueue({
    //     concurrency: 10,
    // });

    // const dir = fs.readdirSync(UPLOAD_PATH);

    // for (const fileName of dir) {
    //     // 如果是文件夹，跳过
    //     if (fs.statSync(path.join(UPLOAD_PATH, fileName)).isDirectory()) {
    //         continue;
    //     }

    //     pq.add(() => upload(wiki, fileName));
    // }

    // await pq.onIdle();
}

tryTest();

export { HuijiWiki };
