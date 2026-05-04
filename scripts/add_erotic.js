const fs = require('fs');
const path = require('path');
const https = require('https');
const DATA_PATH = path.join(__dirname, '..', 'data.json');
const TMDB_KEY = '96ac6a609d077c2d49da61e620697ea7';
const MAX_ITEMS = 200;

const MOVIES = [
  { doubanId: '3006462', title: '霜花店', year: '2008', rate: '7.1', region: '韩国', abstract: '高丽末年，王与亲卫队长洪麟关系亲密，在朝廷压力下王命洪麟与王妃同房以延续血脉，三人陷入了危险的爱情与背叛之中。', genres: ['剧情', '历史', '情色'] },
  { doubanId: '25798160', title: '人间中毒', year: '2014', rate: '6.6', region: '韩国', abstract: '越战英雄金镇平在军营中偶遇下属之妻钟佳欣，两人从克制到沦陷，在压抑的军队环境中发展出一段危险的禁忌之恋。', genres: ['剧情', '爱情', '情色'] },
  { doubanId: '1293964', title: '漂流欲室', year: '2000', rate: '7.3', region: '韩国', abstract: '湖面上零星漂浮着几座船屋旅馆，哑女熙真经营着这片水上世界。一名逃亡的警察来到此地，两人在水与欲望中纠缠。', genres: ['剧情', '情色'] },
  { doubanId: '10440909', title: '金钱的味道', year: '2012', rate: '6.2', region: '韩国', abstract: '白手起家的企业家拥有秘密资金，年轻的司炉工负责管理这笔钱。围绕金钱与欲望，各色人物展开了赤裸的争夺。', genres: ['剧情', '情色'] },
  { doubanId: '1291542', title: '红字', year: '2004', rate: '7.2', region: '韩国', abstract: '刑警基勋调查一桩杀人案，发现案件与自己的婚外情以及妻子隐藏的秘密紧密交织。谎言、欲望与背叛层层揭开。', genres: ['剧情', '悬疑', '情色'] },
  { doubanId: '1291541', title: '丑闻', year: '2003', rate: '7.0', region: '韩国', abstract: '朝鲜时代著名的花花公子赵元以勾引女人为乐，他将目标对准了守节九年的贞洁寡妇郑氏，展开了一场危险的情欲游戏。', genres: ['剧情', '爱情', '情色'] },
  { doubanId: '26325320', title: '男与女', year: '2016', rate: '8.1', region: '韩国', abstract: '在芬兰大雪中相遇的尚敏和基洪，各自带着有心理问题的孩子，异国他乡的孤独让两人产生了一段无法回头的禁忌情感。', genres: ['剧情', '爱情', '情色'] },
  { doubanId: '4240170', title: '下女', year: '2010', rate: '6.5', region: '韩国', abstract: '怀孕的女工恩新来到一户富裕家庭做女佣，男主人对她产生了欲望。在阶级与欲望的漩涡中，一场毁灭性的悲剧悄然酝酿。', genres: ['剧情', '悬疑', '情色'] },
  { doubanId: '1291544', title: '萨玛利亚少女', year: '2004', rate: '7.4', region: '韩国', abstract: '两名少女出于不同目的开始援交行为，事情逐渐失控。导演金基德以冷静残酷的视角展现了青春期的迷失与社会的冷漠。', genres: ['剧情', '情色'] },
  { doubanId: '1294462', title: '老男孩', year: '2003', rate: '8.8', region: '韩国', abstract: '吴大修被不明人士囚禁15年后突然获释，他踏上了复仇之路，却发现自己陷入了一个更加残忍的阴谋之中。', genres: ['剧情', '悬疑', '情色'] },
  { doubanId: '1418634', title: '亲切的金子', year: '2005', rate: '7.6', region: '韩国', abstract: '金子因绑架杀害儿童入狱13年，出狱后她展开精心策划的复仇计划，要让真正的罪人付出代价。', genres: ['剧情', '犯罪', '情色'] },
  { doubanId: '3011571', title: '蝙蝠', year: '2009', rate: '7.5', region: '韩国', abstract: '神父尚贤自愿参与疫苗实验后意外变成吸血鬼，与朋友的妻子泰珠陷入禁忌之恋，宗教信仰与欲望展开了殊死搏斗。', genres: ['剧情', '恐怖', '情色'] },
  { doubanId: '25827935', title: '绿色椅子', year: '2005', rate: '6.8', region: '韩国', abstract: '32岁的文姬离婚后因与19岁少年发生关系入狱，出狱后两人不顾世俗眼光选择同居。这段年龄悬殊的禁忌关系充满了外界的偏见与压力。', genres: ['剧情', '爱情', '情色'] },
  { doubanId: '1292262', title: '外出', year: '2005', rate: '6.7', region: '韩国', abstract: '仁书的妻子与舒英的丈夫在车祸中重伤，两人赶到医院后发现各自的伴侣早已存在婚外情，同病相怜的他们逐渐产生了复杂的情愫。', genres: ['剧情', '爱情', '情色'] },
  { doubanId: '3287563', title: '奸臣', year: '2015', rate: '6.6', region: '韩国', abstract: '朝鲜燕山君时期，奸臣利用美色控制君王，将一批美女训练成刺杀工具。影片以华丽的古装画面展现了权力、欲望与阴谋的交织。', genres: ['剧情', '历史', '情色'] },
  { doubanId: '1308207', title: '爱的色放', year: '2001', rate: '6.6', region: '韩国', abstract: '1980年代军事管制时期，年轻男子被囚禁在破旧公寓里，通过墙上小孔窥视隔壁的夫妻，见证了一段压抑与欲望交织的禁忌关系。', genres: ['剧情', '情色'] },
  { doubanId: '1308764', title: '甜性涩爱', year: '2003', rate: '6.2', region: '韩国', abstract: '两个孤独的灵魂在深夜的酒吧相遇，通过肉体的亲密来填补内心的空虚，却逐渐发现感情早已超越了纯粹的欲望。', genres: ['剧情', '爱情', '情色'] },
  { doubanId: '1307835', title: '梦精记', year: '2002', rate: '6.5', region: '韩国', abstract: '高中男生们在青春期荷尔蒙的驱使下，展开了一系列荒诞搞笑的性启蒙冒险，在欢笑与尴尬中逐渐成长。', genres: ['喜剧', '情色'] },
  { doubanId: '2132865', title: '色即是空2', year: '2007', rate: '6.1', region: '韩国', abstract: '延续前作风格，以大学校园为背景，讲述年轻男女在爱情与欲望之间的懵懂探索与成长故事。', genres: ['喜剧', '爱情', '情色'] },
  { doubanId: '1291545', title: '空房间', year: '2004', rate: '8.0', region: '韩国', abstract: '无家可归的男子潜入空屋短暂居住，一次意外遇到了遭受家庭暴力的少妇，两人在沉默中发展出一段奇特的关系。', genres: ['剧情', '爱情', '情色'] },
  { doubanId: '1294038', title: '圣殇', year: '2012', rate: '7.7', region: '韩国', abstract: '一名冷酷的高利贷催收员遇到了自称是他母亲的女人，在母子关系的纠缠中，暴力与温情交织出一段扭曲的救赎之路。', genres: ['剧情', '情色'] },
  { doubanId: '1291540', title: '坏小子', year: '2001', rate: '7.3', region: '韩国', abstract: '街头混混亨基对女大学生森华一见钟情，用计将她推入卖淫的深渊，自己则通过一面双面镜默默注视着她。', genres: ['剧情', '爱情', '情色'] },
  { doubanId: '1291566', title: '弓', year: '2005', rate: '7.8', region: '韩国', abstract: '一位老人在海上养大了一个少女，打算在她17岁时娶她为妻。一名年轻男子的到来打破了这份封闭的宁静，欲望与占有在此碰撞。', genres: ['剧情', '情色'] },
  { doubanId: '1294371', title: '呼吸', year: '2007', rate: '6.8', region: '韩国', abstract: '雕塑家妍厌倦了与丈夫的冷淡婚姻，在得知死囚张镇即将被执行死刑后，开始频繁探访他，两人发展出一段危险而绝望的关系。', genres: ['剧情', '情色'] },
  { doubanId: '1294632', title: '谎言', year: '2000', rate: '6.9', region: '韩国', abstract: '两个陌生男女通过电话相识后开始了一场纯粹的肉体关系，每次见面都编造新的谎言，却在不知不觉中产生了真实的情感。', genres: ['剧情', '情色'] },
  { doubanId: '1292925', title: '美人', year: '2004', rate: '6.8', region: '韩国', abstract: '一位作家爱上了美丽的模特恩雪，但恩雪却与一个有暴力倾向的男人纠缠不清。三角关系中，爱与痛苦交织成一曲悲伤的挽歌。', genres: ['剧情', '爱情', '情色'] },
  { doubanId: '1293577', title: '戏梦巴黎', year: '2003', rate: '8.0', region: '法国', abstract: '1968年巴黎学运期间，一对孪生姐弟邀请美国留学生住进家中，三人在封闭的公寓里编织了一段交织着电影、性与政治的乌托邦之梦。', genres: ['剧情', '爱情', '情色'] },
  { doubanId: '1296706', title: '原罪', year: '2001', rate: '7.5', region: '美国', abstract: '19世纪的古巴，咖啡种植园主通过邮购新娘迎娶了一位神秘女子，她的真实身份和不可告人的目的让爱情变成了一场致命的游戏。', genres: ['剧情', '爱情', '情色'] },
  { doubanId: '1293975', title: '不忠', year: '2002', rate: '7.5', region: '美国', abstract: '看似完美的家庭主妇康妮在纽约街头偶遇年轻法国书商，发展出一段危险的婚外情。丈夫发现后，一场意外将三个家庭推向深渊。', genres: ['剧情', '悬疑', '情色'] },
  { doubanId: '1292718', title: '西西里的美丽传说', year: '2000', rate: '8.9', region: '意大利', abstract: '二战时期的西西里小镇，13岁少年雷纳多对美丽少妇玛莲娜一见倾心。战争的残酷、镇民的恶意和少年的幻想交织成一段残酷的青春记忆。', genres: ['剧情', '战争', '情色'] },
  { doubanId: '1292267', title: '钢琴教师', year: '2001', rate: '8.0', region: '法国', abstract: '迈克尔·哈内克执导。维也纳音乐学院严格的女教师埃丽卡与年轻男学生瓦尔特之间展开了一段充满施虐与受虐的扭曲关系。', genres: ['剧情', '情色'] },
  { doubanId: '1297565', title: '九首歌', year: '2004', rate: '6.3', region: '英国', abstract: '一男子回忆与女友在伦敦一年间的生活，两人在摇滚演唱会和卧室之间往返，用音乐和性爱记录了一段短暂而炽烈的恋情。', genres: ['剧情', '音乐', '情色'] },
  { doubanId: '1293579', title: '鹅毛笔', year: '2000', rate: '7.8', region: '美国', abstract: '法国作家萨德侯爵被囚禁在疯人院中，他偷偷写作的情色小说在巴黎流传。神父和医生围绕审查与自由展开了激烈的对抗。', genres: ['剧情', '传记', '情色'] },
  { doubanId: '1294464', title: '花火', year: '1997', rate: '8.6', region: '日本', abstract: '北野武自导自演。退休警察西佳敬为了给病危的妻子最后的幸福，不惜铤而走险抢劫银行。暴力与温柔交织，生命在绝望中绽放如花火。', genres: ['剧情', '犯罪', '情色'] },
  { doubanId: '25774680', title: '热线电话', year: '2011', rate: '6.5', region: '韩国', abstract: '一名电台DJ接到听众的神秘电话，对方声称要杀人。随着直播的进行，真相逐渐浮出水面，而DJ发现自己也深陷其中。', genres: ['剧情', '悬疑', '情色'] },
  { doubanId: '1294364', title: '快乐到死', year: '1999', rate: '7.6', region: '韩国', abstract: '全职太太宝罗与失业丈夫的婚姻死气沉沉，她偷偷与前男友重逢并发展婚外情。丈夫发现后从痛苦猜忌走向极端报复。', genres: ['剧情', '情色'] },
  { doubanId: '1292716', title: '捆着我绑着我', year: '1989', rate: '7.6', region: '西班牙', abstract: '阿尔莫多瓦执导。刚出院的精神病人里奇绑架了女演员玛丽娜，声称要用"爱的囚禁"让她爱上自己。', genres: ['剧情', '爱情', '情色'] },
  { doubanId: '1293980', title: '云上的日子', year: '1995', rate: '7.7', region: '意大利', abstract: '安东尼奥尼与文德斯联合执导。四个关于爱情与欲望的独立故事，每个故事都探讨了爱的不同面向。', genres: ['剧情', '爱情', '情色'] },
  { doubanId: '1291548', title: '大开眼戒', year: '1999', rate: '7.7', region: '美国', abstract: '库布里克遗作。医生威廉姆偶然进入一个神秘的上流社会性爱派对，光怪陆离的场面让他对婚姻和人性产生了深深的怀疑。', genres: ['剧情', '悬疑', '情色'] },
  { doubanId: '1292265', title: '苦月亮', year: '1992', rate: '8.4', region: '英国', abstract: '波兰斯基执导。一对体面的英国夫妇在邮轮上遇到了一对充满破坏欲的情侣，听到了一段从狂热到扭曲的爱情故事。', genres: ['剧情', '爱情', '情色'] },
  { doubanId: '1292257', title: '情人', year: '1992', rate: '8.2', region: '法国', abstract: '1929年越南，15岁的法国少女在湄公河渡轮上遇到了32岁的中国富商，两人展开了一段跨越种族与阶级的禁忌之恋。', genres: ['剧情', '爱情', '情色'] },
  { doubanId: '1291996', title: '感官世界', year: '1976', rate: '8.2', region: '日本', abstract: '大岛渚执导。1936年东京真实事件改编，退役妓女阿部定与旅馆老板吉藏陷入了痴迷的肉体关系，最终以震惊日本的命案收场。', genres: ['剧情', '情色'] },
  { doubanId: '1291844', title: '偷香', year: '1996', rate: '7.6', region: '意大利', abstract: '贝托鲁奇执导。19岁的美国女孩露西来到托斯卡纳乡村，在寻找生父的同时也寻找着自己的初恋和爱情。', genres: ['剧情', '爱情', '情色'] },
  { doubanId: '1292271', title: '教室别恋', year: '1995', rate: '7.5', region: '瑞典', abstract: '1943年瑞典小镇，15岁少年史汀与37岁的女教师维奥拉发展出一段禁忌之恋。少年的初恋与成年女人的欲望纠缠在一起。', genres: ['剧情', '爱情', '情色'] },
  { doubanId: '1293869', title: '爱的亡灵', year: '1978', rate: '7.6', region: '日本', abstract: '大岛渚执导。一个被丈夫冷落的妻子与年轻的车夫发展出婚外情，两人合谋杀害丈夫，却在罪恶感的折磨下走向毁灭。', genres: ['剧情', '情色'] },
  { doubanId: '1292948', title: '巴黎野玫瑰', year: '1986', rate: '8.0', region: '法国', abstract: '性格极端的女孩贝蒂与修理工佐尔格相爱后搬到巴黎追求写作梦想。贝蒂的精神状态逐渐崩溃，爱情走向无法挽回的悲剧。', genres: ['剧情', '爱情', '情色'] },
  { doubanId: '1291848', title: '布拉格之恋', year: '1988', rate: '8.0', region: '美国', abstract: '改编自米兰·昆德拉《不能承受的生命之轻》。布拉格外科医生托马斯在"轻"与"重"之间游走于多个女人之间。', genres: ['剧情', '爱情', '情色'] },
  { doubanId: '1296700', title: '同屋三分惊', year: '1994', rate: '8.2', region: '英国', abstract: '丹尼·博伊尔处女作。三个室友发现新室友死于房间并留下一笔巨款，贪婪与猜忌将友谊撕裂。', genres: ['剧情', '悬疑', '情色'] },
  { doubanId: '1296259', title: '午夜守门人', year: '1974', rate: '7.4', region: '意大利', abstract: '二战后，前纳粹军官在维也纳当旅馆守门人，意外遇到集中营幸存者，两人之间畸形的虐恋关系再度重燃。', genres: ['剧情', '情色'] },
  { doubanId: '1292925', title: '最后的探戈', year: '1972', rate: '7.6', region: '意大利', abstract: '贝托鲁奇执导。刚丧妻的中年男子在巴黎公寓里与年轻女孩发展出一段纯粹基于肉体的匿名关系。', genres: ['剧情', '情色'] },
  { doubanId: '1294453', title: '欲孽杀人夜', year: '1986', rate: '7.2', region: '美国', abstract: '迈克尔·曼执导。FBI探员追踪连环杀手，凶手在月圆之夜作案。紧张的追凶过程中，探员自己也逐渐走向黑暗边缘。', genres: ['剧情', '犯罪', '情色'] },
  { doubanId: '26354424', title: '朴烈', year: '2017', rate: '7.0', region: '韩国', abstract: '日本殖民时期，韩国无政府主义者朴烈与日本女友在东京策划暗杀天皇的行动，两人以极端的方式抵抗帝国主义的压迫。', genres: ['剧情', '历史', '情色'] },
  { doubanId: '1294372', title: '白日焰火', year: '2014', rate: '7.6', region: '中国大陆', abstract: '东北小城发生碎尸案，落魄警察张自力追踪嫌疑人吴志贞，在冰天雪地中，真相与情欲交织。', genres: ['剧情', '悬疑', '情色'] },
  { doubanId: '1296148', title: '色戒', year: '2007', rate: '8.7', region: '中国大陆', abstract: '李安执导。抗战时期，岭南大学女生王佳芝被派去色诱汪伪政府特务头目易先生，在伪装的爱情与真实的情感之间走向危险的深渊。', genres: ['剧情', '爱情', '情色'] },
];

const NON_EROTIC_IDS = [
  '1292268', '1292263', '1292273', '1293967', '1292720', '1294370',
  '1294461', '1293966', '25855253', '1294463', '1291547', '1292269',
  '1292264', '1294218', '1293637', '1294373', '1294457', '1293972',
  '1294015', '1294368', '1291543', '1291546', '1291549', '1293961',
  '1291850', '1291853', '1300877', '1293578',
];

const TMDB_ALIASES = {
  '春去春又来': 'Spring, Summer, Fall, Winter... and Spring',
  '春夏秋冬又一春': 'Spring, Summer, Fall, Winter... and Spring',
  '萨玛利亚少女': 'Samaritan Girl',
  '坏小子': 'Bad Guy',
  '死亡直播': 'The Terror Live',
  '大话情圣': 'My Scary Girl',
  '金钱的味道': 'The Taste of Money',
  '收件人不详': 'Address Unknown',
  '弓': 'The Bow',
  '海岸线': 'The Coast Guard',
  '触不到的恋人': 'Il Mare',
  '谎言之恋': 'Lies',
  '坏小子': 'tt0307213',
  '恋之罪': '恋の罪',
};

function tmdbFindByImdb(imdbId) {
  return new Promise((resolve) => {
    const p = '/3/find/' + imdbId + '?api_key=' + TMDB_KEY + '&language=zh-CN&external_source=imdb_id';
    https.get('https://api.themoviedb.org' + p, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { const j = JSON.parse(d); resolve(j.movie_results && j.movie_results.length > 0 ? j.movie_results[0] : null); }
        catch (e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

function tmdbSearch(query, year) {
  return new Promise((resolve) => {
    let p = '/3/search/movie?api_key=' + TMDB_KEY + '&query=' + encodeURIComponent(query) + '&language=zh-CN&include_adult=true';
    if (year) p += '&primary_release_year=' + year;
    https.get('https://api.themoviedb.org' + p, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { const j = JSON.parse(d); resolve(j.results && j.results.length > 0 ? j.results[0] : null); }
        catch (e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fixCovers(movieList) {
  console.log('\n=== 修复封面 (TMDB) ===');
  let fixed = 0;
  for (const m of movieList) {
    if (m.cover && !m.cover.includes('doubanio.com') && m.cover !== '') continue;
    try {
      let result = await tmdbSearch(m.title, m.year);
      if (!result || !result.poster_path) {
        const alias = TMDB_ALIASES[m.title];
        if (alias) {
          console.log('  RETRY:', m.title, '->', alias);
          if (alias.startsWith('tt')) {
            result = await tmdbFindByImdb(alias);
          } else {
            result = await tmdbSearch(alias, m.year);
          }
        }
      }
      if (result && result.poster_path) {
        m.cover = 'https://image.tmdb.org/t/p/w500' + result.poster_path;
        fixed++;
        console.log('  FIX:', m.title, '->', result.poster_path);
      } else {
        console.log('  MISS:', m.title, '(no TMDB poster)');
      }
    } catch (e) {
      console.log('  ERR:', m.title, e.message);
    }
    await sleep(250);
  }
  console.log('Fixed covers:', fixed);
}

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const gi = data.genreIndex || {};
  const qs = gi['情色'] || { movie: [], drama: [] };

  const existingIds = new Set();
  for (const item of [...(qs.movie || []), ...(qs.drama || [])]) {
    if (item.doubanId) existingIds.add(String(item.doubanId));
  }
  let added = 0;
  for (const m of MOVIES) {
    if (existingIds.has(m.doubanId)) { console.log('EXISTS:', m.title); continue; }
    const rate = parseFloat(m.rate) || 0;
    const hotScore = Math.round(rate * 10 + 150);
    qs.movie.push({ doubanId: m.doubanId, title: m.title, rate: m.rate, year: m.year, cover: m.cover || '', directors: [], casts: [], genres: m.genres, abstract: m.abstract, region: m.region, hotScore, supplement: true });
    existingIds.add(m.doubanId);
    added++;
    console.log('ADD:', m.title, '(' + m.year + ') rate:' + m.rate);
  }

  qs.movie = qs.movie.filter(m => {
    if (NON_EROTIC_IDS.includes(m.doubanId)) { console.log('REMOVE (non-erotic):', m.title); return false; }
    if ((m.region || '').includes('中国大陆')) { console.log('REMOVE (mainland China):', m.title); return false; }
    return true;
  });

  await fixCovers(qs.movie);

  qs.movie.sort((a, b) => (b.hotScore || 0) - (a.hotScore || 0));
  qs.movie = qs.movie.slice(0, MAX_ITEMS);
  gi['情色'] = qs;
  data.genreIndex = gi;
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log('\nAdded:', added, 'Final total:', qs.movie.length, '(capped at', MAX_ITEMS + ')');
}
main();
