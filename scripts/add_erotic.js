const fs = require('fs');
const path = require('path');
const DATA_PATH = path.join(__dirname, '..', 'data.json');
const MOVIES = [
  { doubanId: '3006462', title: '霜花店', year: '2008', rate: '7.1', region: '韩国', abstract: '高丽末年，王（朱镇模饰）与亲卫队长洪麟（赵寅成饰）关系亲密，在朝廷压力下王命洪麟与王妃（宋智孝饰）同房以延续血脉，三人陷入了危险的爱情与背叛之中。', genres: ['剧情', '历史', '情色'], cover: 'https://img9.doubanio.com/view/photo/s_ratio_poster/public/p456672822.jpg' },
  { doubanId: '25798160', title: '人间中毒', year: '2014', rate: '6.6', region: '韩国', abstract: '越战英雄金镇平（宋承宪饰）在军营中偶遇下属之妻钟佳欣（林智妍饰），两人从克制到沦陷，在压抑的军队环境中发展出一段危险的禁忌之恋。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199654956.jpg' },
  { doubanId: '1293964', title: '漂流欲室', year: '2000', rate: '7.3', region: '韩国', abstract: '湖面上零星漂浮着几座船屋旅馆，哑女熙真经营着这片水上世界。一名逃亡的警察贤植来到此地，两人在水与欲望中纠缠，上演了一段无言的残酷爱情。', genres: ['剧情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2514742598.jpg' },
  { doubanId: '10440909', title: '金钱的味道', year: '2012', rate: '6.2', region: '韩国', abstract: '白手起家的企业家常汝璘拥有秘密资金，年轻的司炉工英在负责管理这笔钱。围绕金钱与欲望，各色人物展开了赤裸的争夺。', genres: ['剧情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p1686238378.jpg' },
  { doubanId: '1291542', title: '红字', year: '2004', rate: '7.2', region: '韩国', abstract: '刑警基勋（韩石圭饰）调查一桩杀人案，发现案件与自己的婚外情以及妻子隐藏的秘密紧密交织。谎言、欲望与背叛层层揭开，每个人的选择都在反噬自己。', genres: ['剧情', '悬疑', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199519598.jpg' },
  { doubanId: '1291541', title: '丑闻', year: '2003', rate: '7.0', region: '韩国', abstract: '朝鲜时代著名的花花公子赵元（裴勇俊饰）以勾引女人为乐，他将目标对准了守节九年的贞洁寡妇郑氏（李美淑饰），展开了一场危险的情欲游戏。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2355383040.jpg' },
  { doubanId: '26325320', title: '男与女', year: '2016', rate: '8.1', region: '韩国', abstract: '在芬兰大雪中相遇的尚敏（全度妍饰）和基洪（孔刘饰），各自带着有心理问题的孩子，异国他乡的孤独让两人产生了一段无法回头的禁忌情感。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2315868760.jpg' },
  { doubanId: '1293643', title: '快乐到死', year: '1999', rate: '7.6', region: '韩国', abstract: '全职太太宝罗（全度妍饰）与失业丈夫的婚姻死气沉沉，她偷偷与前男友重逢并发展婚外情。丈夫发现后从痛苦猜忌走向极端报复，三人的命运坠入深渊。', genres: ['剧情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2174204698.jpg' },
  { doubanId: '4240170', title: '下女', year: '2010', rate: '6.5', region: '韩国', abstract: '怀孕的女工恩新（全度妍饰）来到一户富裕家庭做女佣，男主人（李政宰饰）对她产生了欲望。在阶级与欲望的漩涡中，一场毁灭性的悲剧悄然酝酿。', genres: ['剧情', '悬疑', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p457507053.jpg' },
  { doubanId: '1291544', title: '萨玛利亚少女', year: '2004', rate: '7.4', region: '韩国', abstract: '两名少女出于不同目的开始援交行为，事情逐渐失控。导演金基德以冷静残酷的视角展现了青春期的迷失与社会的冷漠。', genres: ['剧情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199672268.jpg' },
  { doubanId: '1294462', title: '老男孩', year: '2003', rate: '8.8', region: '韩国', abstract: '吴大修（崔岷植饰）被不明人士囚禁15年后突然获释，他踏上了复仇之路，却发现自己陷入了一个更加残忍的阴谋之中。', genres: ['剧情', '悬疑', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p448449950.jpg' },
  { doubanId: '1418634', title: '亲切的金子', year: '2005', rate: '7.6', region: '韩国', abstract: '金子（李英爱饰）因绑架杀害儿童入狱13年，出狱后她展开精心策划的复仇计划，要让真正的罪人付出代价。', genres: ['剧情', '犯罪', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p453671762.jpg' },
  { doubanId: '3011571', title: '蝙蝠', year: '2009', rate: '7.5', region: '韩国', abstract: '神父尚贤（宋康昊饰）自愿参与疫苗实验后意外变成吸血鬼，与朋友的妻子泰珠（金玉彬饰）陷入禁忌之恋，宗教信仰与欲望展开了殊死搏斗。', genres: ['剧情', '恐怖', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p457509736.jpg' },
  { doubanId: '25827935', title: '绿色椅子', year: '2005', rate: '6.8', region: '韩国', abstract: '32岁的文姬离婚后因与19岁少年发生关系入狱，出狱后两人不顾世俗眼光选择同居。这段年龄悬殊的禁忌关系充满了外界的偏见与压力。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199683566.jpg' },
  { doubanId: '1292262', title: '外出', year: '2005', rate: '6.7', region: '韩国', abstract: '仁书（裴勇俊饰）的妻子与舒英（孙艺珍饰）的丈夫在车祸中重伤，两人赶到医院后发现各自的伴侣早已存在婚外情，同病相怜的他们逐渐产生了复杂的情愫。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199625049.jpg' },
  { doubanId: '3287563', title: '奸臣', year: '2015', rate: '6.6', region: '韩国', abstract: '朝鲜燕山君时期，奸臣任士洪和慎守勤利用美色控制君王，将一批美女训练成刺杀工具。影片以华丽的古装画面展现了权力、欲望与阴谋的交织。', genres: ['剧情', '历史', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2246080220.jpg' },
  { doubanId: '1308207', title: '爱的色放', year: '2001', rate: '6.6', region: '韩国', abstract: '1980年代军事管制时期，年轻男子被囚禁在破旧公寓里，通过墙上小孔窥视隔壁的夫妻，见证了一段压抑与欲望交织的禁忌关系。', genres: ['剧情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199609755.jpg' },
  { doubanId: '1308764', title: '甜性涩爱', year: '2003', rate: '6.2', region: '韩国', abstract: '两个孤独的灵魂在深夜的酒吧相遇，通过肉体的亲密来填补内心的空虚，却逐渐发现感情早已超越了纯粹的欲望。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2594557945.jpg' },
  { doubanId: '1307835', title: '梦精记', year: '2002', rate: '6.5', region: '韩国', abstract: '高中男生们在青春期荷尔蒙的驱使下，展开了一系列荒诞搞笑的性启蒙冒险，在欢笑与尴尬中逐渐成长。', genres: ['喜剧', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199694327.jpg' },
  { doubanId: '2132865', title: '色即是空2', year: '2007', rate: '6.1', region: '韩国', abstract: '延续前作风格，以大学校园为背景，讲述年轻男女在爱情与欲望之间的懵懂探索与成长故事。', genres: ['喜剧', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199630288.jpg' },
];
function main() {
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
    qs.movie.push({ doubanId: m.doubanId, title: m.title, rate: m.rate, year: m.year, cover: m.cover, directors: [], casts: [], genres: m.genres, abstract: m.abstract, region: m.region, hotScore, supplement: true });
    existingIds.add(m.doubanId);
    added++;
    console.log('ADD:', m.title, '(' + m.year + ') rate:' + m.rate);
  }
  qs.movie.sort((a, b) => (b.hotScore || 0) - (a.hotScore || 0));
  gi['情色'] = qs;
  data.genreIndex = gi;
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log('\nAdded:', added, 'Total movies:', qs.movie.length);
}
main();
