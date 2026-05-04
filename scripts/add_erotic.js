const fs = require('fs');
const path = require('path');
const DATA_PATH = path.join(__dirname, '..', 'data.json');
const MOVIES = [
  { doubanId: '3006462', title: '霜花店', year: '2008', rate: '7.1', region: '韩国', abstract: '高丽末年，王与亲卫队长洪麟关系亲密，在朝廷压力下王命洪麟与王妃同房以延续血脉，三人陷入了危险的爱情与背叛之中。', genres: ['剧情', '历史', '情色'], cover: 'https://img9.doubanio.com/view/photo/s_ratio_poster/public/p456672822.jpg' },
  { doubanId: '25798160', title: '人间中毒', year: '2014', rate: '6.6', region: '韩国', abstract: '越战英雄金镇平在军营中偶遇下属之妻钟佳欣，两人从克制到沦陷，在压抑的军队环境中发展出一段危险的禁忌之恋。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199654956.jpg' },
  { doubanId: '1293964', title: '漂流欲室', year: '2000', rate: '7.3', region: '韩国', abstract: '湖面上零星漂浮着几座船屋旅馆，哑女熙真经营着这片水上世界。一名逃亡的警察来到此地，两人在水与欲望中纠缠。', genres: ['剧情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2514742598.jpg' },
  { doubanId: '10440909', title: '金钱的味道', year: '2012', rate: '6.2', region: '韩国', abstract: '白手起家的企业家拥有秘密资金，年轻的司炉工负责管理这笔钱。围绕金钱与欲望，各色人物展开了赤裸的争夺。', genres: ['剧情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p1686238378.jpg' },
  { doubanId: '1291542', title: '红字', year: '2004', rate: '7.2', region: '韩国', abstract: '刑警基勋调查一桩杀人案，发现案件与自己的婚外情以及妻子隐藏的秘密紧密交织。谎言、欲望与背叛层层揭开。', genres: ['剧情', '悬疑', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199519598.jpg' },
  { doubanId: '1291541', title: '丑闻', year: '2003', rate: '7.0', region: '韩国', abstract: '朝鲜时代著名的花花公子赵元以勾引女人为乐，他将目标对准了守节九年的贞洁寡妇郑氏，展开了一场危险的情欲游戏。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2355383040.jpg' },
  { doubanId: '26325320', title: '男与女', year: '2016', rate: '8.1', region: '韩国', abstract: '在芬兰大雪中相遇的尚敏和基洪，各自带着有心理问题的孩子，异国他乡的孤独让两人产生了一段无法回头的禁忌情感。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2315868760.jpg' },
  { doubanId: '1293643', title: '快乐到死', year: '1999', rate: '7.6', region: '韩国', abstract: '全职太太宝罗与失业丈夫的婚姻死气沉沉，她偷偷与前男友重逢并发展婚外情。丈夫发现后从痛苦猜忌走向极端报复。', genres: ['剧情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2174204698.jpg' },
  { doubanId: '4240170', title: '下女', year: '2010', rate: '6.5', region: '韩国', abstract: '怀孕的女工恩新来到一户富裕家庭做女佣，男主人对她产生了欲望。在阶级与欲望的漩涡中，一场毁灭性的悲剧悄然酝酿。', genres: ['剧情', '悬疑', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p457507053.jpg' },
  { doubanId: '1291544', title: '萨玛利亚少女', year: '2004', rate: '7.4', region: '韩国', abstract: '两名少女出于不同目的开始援交行为，事情逐渐失控。导演金基德以冷静残酷的视角展现了青春期的迷失与社会的冷漠。', genres: ['剧情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199672268.jpg' },
  { doubanId: '1294462', title: '老男孩', year: '2003', rate: '8.8', region: '韩国', abstract: '吴大修被不明人士囚禁15年后突然获释，他踏上了复仇之路，却发现自己陷入了一个更加残忍的阴谋之中。', genres: ['剧情', '悬疑', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p448449950.jpg' },
  { doubanId: '1418634', title: '亲切的金子', year: '2005', rate: '7.6', region: '韩国', abstract: '金子因绑架杀害儿童入狱13年，出狱后她展开精心策划的复仇计划，要让真正的罪人付出代价。', genres: ['剧情', '犯罪', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p453671762.jpg' },
  { doubanId: '3011571', title: '蝙蝠', year: '2009', rate: '7.5', region: '韩国', abstract: '神父尚贤自愿参与疫苗实验后意外变成吸血鬼，与朋友的妻子泰珠陷入禁忌之恋，宗教信仰与欲望展开了殊死搏斗。', genres: ['剧情', '恐怖', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p457509736.jpg' },
  { doubanId: '25827935', title: '绿色椅子', year: '2005', rate: '6.8', region: '韩国', abstract: '32岁的文姬离婚后因与19岁少年发生关系入狱，出狱后两人不顾世俗眼光选择同居。这段年龄悬殊的禁忌关系充满了外界的偏见与压力。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199683566.jpg' },
  { doubanId: '1292262', title: '外出', year: '2005', rate: '6.7', region: '韩国', abstract: '仁书的妻子与舒英的丈夫在车祸中重伤，两人赶到医院后发现各自的伴侣早已存在婚外情，同病相怜的他们逐渐产生了复杂的情愫。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199625049.jpg' },
  { doubanId: '3287563', title: '奸臣', year: '2015', rate: '6.6', region: '韩国', abstract: '朝鲜燕山君时期，奸臣利用美色控制君王，将一批美女训练成刺杀工具。影片以华丽的古装画面展现了权力、欲望与阴谋的交织。', genres: ['剧情', '历史', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2246080220.jpg' },
  { doubanId: '1308207', title: '爱的色放', year: '2001', rate: '6.6', region: '韩国', abstract: '1980年代军事管制时期，年轻男子被囚禁在破旧公寓里，通过墙上小孔窥视隔壁的夫妻，见证了一段压抑与欲望交织的禁忌关系。', genres: ['剧情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199609755.jpg' },
  { doubanId: '1308764', title: '甜性涩爱', year: '2003', rate: '6.2', region: '韩国', abstract: '两个孤独的灵魂在深夜的酒吧相遇，通过肉体的亲密来填补内心的空虚，却逐渐发现感情早已超越了纯粹的欲望。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2594557945.jpg' },
  { doubanId: '1307835', title: '梦精记', year: '2002', rate: '6.5', region: '韩国', abstract: '高中男生们在青春期荷尔蒙的驱使下，展开了一系列荒诞搞笑的性启蒙冒险，在欢笑与尴尬中逐渐成长。', genres: ['喜剧', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199694327.jpg' },
  { doubanId: '2132865', title: '色即是空2', year: '2007', rate: '6.1', region: '韩国', abstract: '延续前作风格，以大学校园为背景，讲述年轻男女在爱情与欲望之间的懵懂探索与成长故事。', genres: ['喜剧', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199630288.jpg' },
  { doubanId: '1294015', title: '春夏秋冬又一春', year: '2003', rate: '8.9', region: '韩国', abstract: '以四季为时间线，讲述一个和尚从童年到老年的生命历程。金基德以极简手法探讨了欲望、罪恶与救赎的永恒命题。', genres: ['剧情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p457234037.jpg' },
  { doubanId: '1291545', title: '空房间', year: '2004', rate: '8.0', region: '韩国', abstract: '无家可归的男子潜入空屋短暂居住，一次意外遇到了遭受家庭暴力的少妇，两人在沉默中发展出一段奇特的关系。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199629919.jpg' },
  { doubanId: '1294368', title: '收件人不详', year: '2001', rate: '7.8', region: '韩国', abstract: '1970年代韩国美军基地附近的小村庄，混血少年、卖狗肉的男人、被歧视的女孩，各自在战争遗留的创伤中挣扎求生。', genres: ['剧情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199615977.jpg' },
  { doubanId: '1294038', title: '圣殇', year: '2012', rate: '7.7', region: '韩国', abstract: '一名冷酷的高利贷催收员遇到了自称是他母亲的女人，在母子关系的纠缠中，暴力与温情交织出一段扭曲的救赎之路。', genres: ['剧情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p1657421963.jpg' },
  { doubanId: '1291540', title: '坏小子', year: '2001', rate: '7.3', region: '韩国', abstract: '街头混混亨基对女大学生森华一见钟情，用计将她推入卖淫的深渊，自己则通过一面双面镜默默注视着她。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199650059.jpg' },
  { doubanId: '1291566', title: '弓', year: '2005', rate: '7.8', region: '韩国', abstract: '一位老人在海上养大了一个少女，打算在她17岁时娶她为妻。一名年轻男子的到来打破了这份封闭的宁静，欲望与占有在此碰撞。', genres: ['剧情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199611536.jpg' },
  { doubanId: '1293972', title: '海岸线', year: '2002', rate: '7.0', region: '韩国', abstract: '一名海岸线巡逻兵误杀平民后精神崩溃，被害者的女友也陷入疯狂。军队体制的冷酷与个体的毁灭交织成悲剧。', genres: ['剧情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199665580.jpg' },
  { doubanId: '1294626', title: '情事', year: '1998', rate: '7.5', region: '韩国', abstract: '素贤有一个美满的家庭，却与比自己小11岁的准妹夫宇发展出禁忌之恋。在道德与欲望的拉扯中，两段关系都无法回头。', genres: ['剧情', '爱情', '情色'], cover: 'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2596196998.jpg' },
  { doubanId: '1292268', title: '雏菊', year: '2006', rate: '8.1', region: '韩国', abstract: '阿姆斯特丹广场上，街头画家惠英等待初恋。刑警正宇和国际杀手朴义同时爱上了她，三人卷入了一场无声的爱与牺牲。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p456690547.jpg' },
  { doubanId: '1292263', title: '我脑中的橡皮擦', year: '2004', rate: '7.9', region: '韩国', abstract: '富家女秀真与建筑工人哲洙不顾身份差距相爱结婚，然而秀真被诊断出阿尔茨海默症，记忆逐渐消逝的爱情考验着两人。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199567918.jpg' },
  { doubanId: '1292273', title: '悲伤电影', year: '2005', rate: '7.8', region: '韩国', abstract: '四个关于离别的故事交织在一起：消防员与手语主播、哑女与游乐园画师、母亲与儿子、拳击手与女友，每个离别都令人动容。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199590241.jpg' },
  { doubanId: '1293967', title: '薄荷糖', year: '2000', rate: '8.3', region: '韩国', abstract: '以倒叙方式讲述主人公金永浩从成功商人走向绝望自杀的20年人生轨迹，折射韩国近代史的动荡与个人命运的悲剧。', genres: ['剧情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199606831.jpg' },
  { doubanId: '1291543', title: '地址不详', year: '2001', rate: '7.4', region: '韩国', abstract: '金基德以冷酷笔触描绘了驻韩美军基地附近村庄中，被战争和美军遗弃的边缘人物的悲惨生活与扭曲欲望。', genres: ['剧情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2531141505.jpg' },
  { doubanId: '1291546', title: '撒玛利亚女孩', year: '2004', rate: '7.4', region: '韩国', abstract: '两个少女一个负责援交一个负责望风，事后以"巴斯德"和"抚慰"自称。悲剧发生后，幸存少女开始以赎罪的方式与那些男人见面。', genres: ['剧情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199672268.jpg' },
  { doubanId: '1292720', title: '不可不信缘', year: '2002', rate: '8.1', region: '韩国', abstract: '珠熙和梓希母女两代人的爱情故事跨越时空遥相呼应，母亲未完成的初恋在女儿身上重演，缘分让爱情跨越世代。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199565686.jpg' },
  { doubanId: '1294370', title: '密阳', year: '2007', rate: '8.0', region: '韩国', abstract: '丧夫的申爱带着儿子来到丈夫的故乡密阳重新开始，却遭遇更大的悲剧。在宗教信仰与仇恨之间，她经历了一场灵魂的炼狱。', genres: ['剧情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p457234662.jpg' },
  { doubanId: '1294464', title: '花火', year: '1997', rate: '8.6', region: '日本', abstract: '退休警察西佳敬为了给病危的妻子最后的幸福，不惜铤而走险抢劫银行。暴力与温柔交织，生命在绝望中绽放如花火。北野武巅峰之作。', genres: ['剧情', '犯罪', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p456702852.jpg' },
  { doubanId: '1294373', title: '大话情圣', year: '2004', rate: '6.5', region: '韩国', abstract: '花花公子文洙与四个女人之间的情感纠葛，在嬉笑怒骂中揭示了现代都市男女在爱情与欲望之间的迷茫。', genres: ['喜剧', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199643991.jpg' },
  { doubanId: '1294461', title: '触不到的恋人', year: '2000', rate: '7.9', region: '韩国', abstract: '一个神奇的信箱连接了相隔两年的两个人，恩贤和星贤通过书信坠入爱河，却发现自己身处不同的时空。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199587634.jpg' },
  { doubanId: '1291549', title: '初恋', year: '1993', rate: '7.6', region: '韩国', abstract: '一部描绘韩国六十年代社会风貌的爱情电影，在动荡的时代背景下，一对年轻人的纯真爱情遭遇了现实的残酷打击。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199694289.jpg' },
  { doubanId: '1300877', title: '漂流青春', year: '2002', rate: '7.1', region: '法国', abstract: '三个不同年代的片段串联起一段跨越性别的爱情与身份认同之旅，在青春的漂流中寻找自我与爱的真谛。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199609727.jpg' },
  { doubanId: '1293578', title: '白日焰火', year: '2014', rate: '7.6', region: '中国大陆', abstract: '东北小城发生碎尸案，落魄警察张自力追踪嫌疑人吴志贞，在冰天雪地中，真相与情欲交织成一团化不开的迷雾。', genres: ['剧情', '悬疑', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2174037620.jpg' },
  { doubanId: '1293966', title: '绿洲', year: '2002', rate: '8.4', region: '韩国', abstract: '有过失杀人前科的洪钟杜与重度脑瘫女子韩恭洙相爱，两个被社会遗弃的边缘人在偏见与歧视中守护着彼此的温暖。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199615981.jpg' },
  { doubanId: '1294371', title: '呼吸', year: '2007', rate: '6.8', region: '韩国', abstract: '雕塑家妍厌倦了与丈夫的冷淡婚姻，在得知死囚张镇即将被执行死刑后，开始频繁探访他，两人发展出一段危险而绝望的关系。', genres: ['剧情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199669937.jpg' },
  { doubanId: '1293961', title: '美术馆旁的动物园', year: '1998', rate: '7.8', region: '韩国', abstract: '失恋的军官春洙在地铁站偶遇被男友抛弃的顺洪，两人因一本遗落的相册开始了一段意外的同居生活，爱情在平凡的日常中悄然生长。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199694311.jpg' },
  { doubanId: '1294457', title: '死亡直播', year: '2000', rate: '7.2', region: '韩国', abstract: '电视台制作人利用一桩真实绑架案策划直播节目以追求收视率，却在欲望与道德的漩涡中越陷越深。', genres: ['剧情', '悬疑', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199648721.jpg' },
  { doubanId: '1292264', title: '爱的蹦极', year: '2001', rate: '7.8', region: '韩国', abstract: '1983年夏日，承仁在雨中遇见了正在学蹦极的女子太嬉。一见钟情后，太嬉却神秘失踪。17年后，他遇到了一个与太嬉极为相似的男子。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199579081.jpg' },
  { doubanId: '25855253', title: '燃烧', year: '2018', rate: '8.1', region: '韩国', abstract: '底层青年钟秀偶遇童年邻居惠美，惠美从非洲旅行回来后带来了神秘的富家子本。三人之间微妙的关系随着惠美的失踪走向了不可预知的方向。', genres: ['剧情', '悬疑', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2529146904.jpg' },
  { doubanId: '1296148', title: '色戒', year: '2007', rate: '8.7', region: '中国大陆', abstract: '抗战时期，岭南大学女生王佳芝被派去色诱汪伪政府特务头目易先生，在伪装的爱情与真实的情感之间，她走向了危险的深渊。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p456825608.jpg' },
  { doubanId: '1292260', title: '八月照相馆', year: '1998', rate: '8.0', region: '韩国', abstract: '身患绝症的照相馆主人余原在生命的最后时光里，遇到了开朗的女孩多琳。他知道无法给她未来，却无法抗拒这份温暖。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199604636.jpg' },
  { doubanId: '1294463', title: '人鱼公主', year: '2004', rate: '7.0', region: '韩国', abstract: '海边小镇上，裁缝家的三个女儿各自经历着不同的爱情故事。大姐守护着对已婚男人的禁忌之恋，二姐在初恋中成长，小妹天真烂漫。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199606940.jpg' },
  { doubanId: '1293962', title: '加油站被袭事件', year: '1999', rate: '7.5', region: '韩国', abstract: '四个无业青年凌晨持枪抢劫加油站，将所有人质囚禁在加油站内，却意外发现每个人都有不为人知的另一面。黑色幽默与社会批判交织。', genres: ['喜剧', '犯罪', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199665601.jpg' },
  { doubanId: '1294372', title: '不肯去观音', year: '2013', rate: '5.8', region: '韩国', abstract: '唐朝时期，日本僧人慧锷多次入唐求取观音像，与宫廷中陷入情感纠葛的光王李怡产生交集。', genres: ['剧情', '历史', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p1995428898.jpg' },
  { doubanId: '1291547', title: '真情假爱', year: '2003', rate: '6.9', region: '韩国', abstract: '一个骗子与一个女人的相遇，在欺骗与被欺骗的游戏中，两颗孤独的心却逐渐靠近。谎言中能否开出真爱的花？', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199635525.jpg' },
  { doubanId: '1292269', title: '恋爱小说', year: '2002', rate: '7.1', region: '韩国', abstract: '五个年轻人的爱情与友情交织在一起，在青春的尾巴上，每个人都必须面对成长带来的选择与失落。', genres: ['剧情', '爱情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2199634340.jpg' },
  { doubanId: '1293567', title: '春去春又来', year: '2003', rate: '8.9', region: '韩国', abstract: '以四季轮回为结构，讲述一个小和尚从童年到成年的修行历程。金基德以极简主义美学探讨了人性的欲望、罪恶与救赎。', genres: ['剧情', '情色'], cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p457234037.jpg' },
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
