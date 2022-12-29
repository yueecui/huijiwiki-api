import { HuijiWiki } from './HuijiWiki/HuijiWiki';
import { TESTBOT_PASSWORD, TESTBOT_USERNAME } from './secret';

async function tryTest() {
    const test = new HuijiWiki('danteng');
    if (await test.apiLogin(TESTBOT_USERNAME, TESTBOT_PASSWORD)) {
        console.log('login success');
    } else {
        console.log('login failed');
        return;
    }

    // const res = await test.edit('Testabc', 'testcontentBCDE', {
    //     // summary: 'test',
    //     // isBot: false,
    // });
    const filepath = 'D:\\Pictures\\IMG_0089.JPG';
    console.log(filepath);
    // const res = await test.uploadImage(filepath, 'elysia.jpg', { comment: 'test' });
    const res = await test.undeletePage('文件:Elysia.png', 'test undel');

    console.log(JSON.stringify(res));
}

tryTest();

export { HuijiWiki };
