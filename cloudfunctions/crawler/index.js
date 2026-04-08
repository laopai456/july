const cloud = require('wx-server-sdk')

cloud.init({ env: 'cloud1-5gl9tqz7860b840c' })

const db = cloud.database()
const _ = db.command

function getSubCategory(mainCategory, genres, region) {
  if (mainCategory === '综艺') {
    for (const g of genres) {
      if (['恋爱', '情感'].includes(g)) return '恋爱'
    }
    for (const g of genres) {
      if (['搞笑', '喜剧'].includes(g)) return '搞笑'
    }
    return '真人秀'
  }
  
  if (mainCategory === '电影') {
    for (const g of genres) {
      if (['悬疑', '犯罪', '惊悚'].includes(g)) return '悬疑'
    }
    for (const g of genres) {
      if (['爱情', '恋爱'].includes(g)) return '恋爱'
    }
    for (const g of genres) {
      if (['喜剧', '搞笑'].includes(g)) return '喜剧'
    }
    return '喜剧'
  }
  
  if (mainCategory === '热剧') {
    if (region === 'kr') return '韩剧'
    if (region === 'jp') return '日剧'
    return '国产剧'
  }
  
  return ''
}

const VARIETY_DATA = [
  { title: '种地吧', titleEn: 'Farming Boys', region: 'cn', year: 2023, rating: 9.0, genres: ['真人秀', '生活'] },
  { title: '快乐再出发', titleEn: 'Happy Reunion', region: 'cn', year: 2022, rating: 9.6, genres: ['真人秀', '旅行'] },
  { title: '快乐再出发2', titleEn: 'Happy Reunion 2', region: 'cn', year: 2023, rating: 9.5, genres: ['真人秀', '旅行'] },
  { title: '十五年等待候鸟', titleEn: 'Waiting for Migratory Birds', region: 'cn', year: 2024, rating: 8.8, genres: ['真人秀'] },
  { title: '向往的生活7', titleEn: 'A Life You Dream Of', region: 'cn', year: 2024, rating: 7.8, genres: ['真人秀', '生活'] },
  { title: '五十公里桃花坞3', titleEn: 'Peach Blossom 50km', region: 'cn', year: 2024, rating: 7.5, genres: ['真人秀', '生活'] },
  { title: '花儿与少年5', titleEn: 'Flower and Youth', region: 'cn', year: 2024, rating: 7.6, genres: ['真人秀', '旅行'] },
  { title: '奔跑吧7', titleEn: 'Keep Running', region: 'cn', year: 2024, rating: 7.2, genres: ['真人秀', '游戏'] },
  { title: '极限挑战9', titleEn: 'Go Ahead', region: 'cn', year: 2024, rating: 7.5, genres: ['真人秀', '游戏'] },
  { title: '这就是街舞6', titleEn: 'Street Dance of China', region: 'cn', year: 2024, rating: 8.5, genres: ['真人秀', '竞技'] },
  { title: '一年一度喜剧大赛2', titleEn: 'Comedy Festival', region: 'cn', year: 2023, rating: 8.2, genres: ['喜剧', '搞笑'] },
  { title: '一年一度喜剧大赛3', titleEn: 'Comedy Festival 3', region: 'cn', year: 2024, rating: 8.0, genres: ['喜剧', '搞笑'] },
  { title: '脱口秀大会5', titleEn: 'Rock & Roast', region: 'cn', year: 2023, rating: 7.8, genres: ['搞笑', '脱口秀'] },
  { title: '脱口秀大会6', titleEn: 'Rock & Roast 6', region: 'cn', year: 2024, rating: 7.9, genres: ['搞笑', '脱口秀'] },
  { title: '毛雪汪', titleEn: 'Mao Xue Wang', region: 'cn', year: 2022, rating: 8.3, genres: ['真人秀', '生活'] },
  { title: '朋友请听好2', titleEn: 'Friends Please Listen', region: 'cn', year: 2022, rating: 8.0, genres: ['真人秀', '情感'] },
  { title: '展开说说', titleEn: 'Talk It Out', region: 'cn', year: 2024, rating: 7.8, genres: ['真人秀', '谈话'] },
  { title: '我想和你唱5', titleEn: 'I Want to Sing With You', region: 'cn', year: 2024, rating: 7.5, genres: ['真人秀', '音乐'] },
  { title: '天赐的声音5', titleEn: 'Voice of Gift', region: 'cn', year: 2024, rating: 7.2, genres: ['真人秀', '音乐'] },
  { title: '歌手2024', titleEn: 'Singer 2024', region: 'cn', year: 2024, rating: 8.5, genres: ['真人秀', '音乐'] },
  { title: '乘风破浪的姐姐5', titleEn: 'Sisters Who Make Waves', region: 'cn', year: 2024, rating: 7.6, genres: ['真人秀', '选秀'] },
  { title: '披荆斩棘的哥哥3', titleEn: 'Call Me by Fire', region: 'cn', year: 2024, rating: 7.8, genres: ['真人秀', '选秀'] },
  { title: '青春有你3', titleEn: 'Youth With You 3', region: 'cn', year: 2021, rating: 6.5, genres: ['真人秀', '选秀'] },
  { title: '创造营2021', titleEn: 'Chuang 2021', region: 'cn', year: 2021, rating: 6.8, genres: ['真人秀', '选秀'] },
  { title: '偶像练习生', titleEn: 'Idol Producer', region: 'cn', year: 2018, rating: 7.2, genres: ['真人秀', '选秀'] },
  { title: '心动的信号6', titleEn: 'Heart Signal', region: 'cn', year: 2024, rating: 7.8, genres: ['恋爱', '真人秀'] },
  { title: '半熟恋人3', titleEn: 'Semi-Mature Love', region: 'cn', year: 2024, rating: 7.5, genres: ['恋爱', '真人秀'] },
  { title: '炙爱之战', titleEn: 'Battle of Love', region: 'cn', year: 2024, rating: 7.2, genres: ['恋爱', '真人秀'] },
  { title: '恋爱吧', titleEn: 'Love Hurts', region: 'cn', year: 2024, rating: 7.0, genres: ['恋爱', '真人秀'] },
  { title: '新西游记9', titleEn: 'New Journey to the West', region: 'kr', year: 2023, rating: 9.4, genres: ['真人秀', '旅行'] },
  { title: 'Busted! Game', titleEn: 'Busted', region: 'kr', year: 2022, rating: 8.2, genres: ['真人秀', '游戏'] },
  { title: '血之游戏2', titleEn: 'Game of Blood', region: 'kr', year: 2022, rating: 8.5, genres: ['真人秀', '游戏'] },
  { title: '虽然没准备什么菜', titleEn: 'Not Much Prepared', region: 'kr', year: 2023, rating: 8.8, genres: ['真人秀', '访谈'] },
  { title: 'MAVERICK', titleEn: 'Maverick', region: 'kr', year: 2023, rating: 8.3, genres: ['真人秀', '音乐'] },
  { title: '兄弟拉面', titleEn: 'Brothers Ramen', region: 'kr', year: 2024, rating: 8.5, genres: ['真人秀', '美食'] },
  { title: '海妖的呼唤', titleEn: 'Siren', region: 'kr', year: 2023, rating: 8.7, genres: ['真人秀', '竞技'] },
  { title: '体能之巅2', titleEn: 'Physical 100', region: 'kr', year: 2024, rating: 8.5, genres: ['真人秀', '竞技'] },
  { title: 'llb', titleEn: 'I Live Alone', region: 'kr', year: 2024, rating: 8.6, genres: ['真人秀', '生活'] },
  { title: '惊人日程', titleEn: 'Surprising Schedule', region: 'kr', year: 2024, rating: 8.2, genres: ['真人秀'] },
  { title: '帐篷外面是欧洲3', titleEn: 'Europe Outside the Tent', region: 'kr', year: 2024, rating: 8.3, genres: ['真人秀', '旅行'] }
]

const MOVIE_DATA = [
  { title: '消失的她', titleEn: 'Lost in the Stars', region: 'cn', year: 2023, rating: 7.2, genres: ['悬疑', '犯罪'] },
  { title: '满江红', titleEn: 'Full River Red', region: 'cn', year: 2023, rating: 7.0, genres: ['悬疑', '喜剧'] },
  { title: '第二人生', titleEn: 'Second Life', region: 'cn', year: 2024, rating: 7.5, genres: ['悬疑', '剧情'] },
  { title: '误杀3', titleEn: 'Sheep Without a Shepherd 3', region: 'cn', year: 2024, rating: 7.3, genres: ['悬疑', '犯罪'] },
  { title: '年会不能停', titleEn: 'The Holiday', region: 'cn', year: 2023, rating: 8.1, genres: ['喜剧', '剧情'] },
  { title: '热辣滚烫', titleEn: 'YOLO', region: 'cn', year: 2024, rating: 7.8, genres: ['喜剧', '剧情'] },
  { title: '飞驰人生2', titleEn: 'Pegasus 2', region: 'cn', year: 2024, rating: 7.6, genres: ['喜剧', '运动'] },
  { title: '抓娃娃', titleEn: 'The Movie Emperor', region: 'cn', year: 2024, rating: 7.5, genres: ['喜剧', '剧情'] },
  { title: '熊出没·狂野大陆', titleEn: 'Boonie Bears', region: 'cn', year: 2021, rating: 6.8, genres: ['喜剧', '动画'] },
  { title: '疯狂的外星人', titleEn: 'Crazy Alien', region: 'cn', year: 2019, rating: 6.7, genres: ['喜剧', '科幻'] },
  { title: '流浪地球2', titleEn: 'The Wandering Earth 2', region: 'cn', year: 2023, rating: 8.3, genres: ['科幻', '冒险'] },
  { title: '孤注一掷', titleEn: 'No More Bets', region: 'cn', year: 2023, rating: 7.4, genres: ['犯罪', '剧情'] },
  { title: '八角笼中', titleEn: 'Never Say Never', region: 'cn', year: 2023, rating: 7.5, genres: ['剧情', '运动'] },
  { title: '好像也没那么热血沸腾', titleEn: 'Love is Blind', region: 'cn', year: 2023, rating: 7.2, genres: ['喜剧', '剧情'] },
  { title: '保你平安', titleEn: 'Peaceful', region: 'cn', year: 2023, rating: 7.4, genres: ['喜剧', '剧情'] },
  { title: '学爸', titleEn: 'Love at the End', region: 'cn', year: 2023, rating: 7.1, genres: ['喜剧', '剧情'] },
  { title: '最好的我们', titleEn: 'My People', region: 'cn', year: 2024, rating: 7.0, genres: ['爱情', '剧情'] },
  { title: '倒数说爱你', titleEn: 'Love at First Sight', region: 'cn', year: 2023, rating: 6.2, genres: ['爱情', '奇幻'] },
  { title: '爱在深空', titleEn: 'Love in Deep Space', region: 'cn', year: 2024, rating: 6.5, genres: ['爱情', '科幻'] },
  { title: '被我弄丢两次的王大力', titleEn: 'Twice Lost', region: 'cn', year: 2024, rating: 6.8, genres: ['爱情', '剧情'] },
  { title: '你的婚礼', titleEn: 'My Love', region: 'cn', year: 2021, rating: 5.2, genres: ['爱情', '剧情'] },
  { title: '我要我们在一起', titleEn: 'Love Will Tear Us Apart', region: 'cn', year: 2021, rating: 6.5, genres: ['爱情', '剧情'] },
  { title: '想见你', titleEn: 'Someday or One Day', region: 'cn', year: 2022, rating: 6.8, genres: ['爱情', '奇幻'] },
  { title: '情书', titleEn: 'Love Letter', region: 'jp', year: 1995, rating: 8.9, genres: ['爱情', '剧情'] },
  { title: '四月是你的谎言', titleEn: 'Your Lie in April', region: 'jp', year: 2016, rating: 8.9, genres: ['爱情', '动画'] },
  { title: '天气之子', titleEn: 'Weathering with You', region: 'jp', year: 2019, rating: 7.2, genres: ['爱情', '动画'] },
  { title: '铃芽之旅', titleEn: 'Suzume', region: 'jp', year: 2022, rating: 7.5, genres: ['爱情', '动画'] },
  { title: '你的名字', titleEn: 'Your Name', region: 'jp', year: 2016, rating: 8.4, genres: ['爱情', '动画'] },
  { title: '爱乐之城', titleEn: 'La La Land', region: 'us', year: 2016, rating: 8.4, genres: ['爱情', '音乐'] },
  { title: '怦然心动', titleEn: 'Flipped', region: 'us', year: 2010, rating: 9.1, genres: ['爱情', '剧情'] },
  { title: '消失的她', titleEn: 'Lost in the Stars', region: 'cn', year: 2023, rating: 7.2, genres: ['悬疑', '犯罪'] },
  { title: '满江红', titleEn: 'Full River Red', region: 'cn', year: 2023, rating: 7.0, genres: ['悬疑', '喜剧'] },
  { title: '第二人生', titleEn: 'Second Life', region: 'cn', year: 2024, rating: 7.5, genres: ['悬疑', '剧情'] },
  { title: '误杀3', titleEn: 'Sheep Without a Shepherd 3', region: 'cn', year: 2024, rating: 7.3, genres: ['悬疑', '犯罪'] },
  { title: '焚城', titleEn: 'The Burn', region: 'hk', year: 2024, rating: 7.8, genres: ['悬疑', '灾难'] },
  { title: '破·地狱', titleEn: 'The Last Dance', region: 'hk', year: 2024, rating: 8.5, genres: ['剧情', '喜剧'] },
  { title: '年少日记', titleEn: 'Time Still Turns', region: 'hk', year: 2024, rating: 8.2, genres: ['剧情'] },
  { title: '临时劫案', titleEn: 'Rob & Roll', region: 'hk', year: 2024, rating: 6.8, genres: ['喜剧', '犯罪'] },
  { title: '谈判专家', titleEn: '谈判专家', region: 'cn', year: 2024, rating: 7.2, genres: ['喜剧', '剧情'] },
  { title: '末路狂花钱', titleEn: 'Crazy Money', region: 'cn', year: 2024, rating: 6.5, genres: ['喜剧'] }
]

const DRAMA_DATA = [
  { title: '黑暗荣耀', titleEn: 'The Glory', region: 'kr', year: 2022, rating: 9.0, genres: ['剧情', '复仇'] },
  { title: '黑暗荣耀2', titleEn: 'The Glory Part 2', region: 'kr', year: 2023, rating: 9.0, genres: ['剧情', '复仇'] },
  { title: '鱿鱼游戏', titleEn: 'Squid Game', region: 'kr', year: 2021, rating: 8.0, genres: ['剧情', '惊悚'] },
  { title: '鱿鱼游戏2', titleEn: 'Squid Game 2', region: 'kr', year: 2024, rating: 8.2, genres: ['剧情', '惊悚'] },
  { title: '二十五，二十一', titleEn: 'Twenty-Five Twenty-One', region: 'kr', year: 2022, rating: 8.6, genres: ['爱情', '剧情'] },
  { title: '僵尸校园', titleEn: 'All of Us Are Dead', region: 'kr', year: 2022, rating: 7.5, genres: ['动作', '恐怖'] },
  { title: '财阀家的小儿子', titleEn: 'Reborn Rich', region: 'kr', year: 2022, rating: 7.8, genres: ['剧情', '奇幻'] },
  { title: '非常律师禹英禑', titleEn: 'Extraordinary Attorney Woo', region: 'kr', year: 2022, rating: 8.1, genres: ['剧情', '喜剧'] },
  { title: '我的解放日志', titleEn: 'My Liberation Notes', region: 'kr', year: 2022, rating: 8.8, genres: ['剧情', '爱情'] },
  { title: 'Penthouse 3', titleEn: 'The Penthouse', region: 'kr', year: 2021, rating: 8.1, genres: ['剧情', '复仇'] },
  { title: '梨泰院Class', titleEn: 'Itaewon Class', region: 'kr', year: 2020, rating: 8.2, genres: ['剧情', '爱情'] },
  { title: '顶楼', titleEn: 'The Penthouse', region: 'kr', year: 2020, rating: 8.1, genres: ['剧情', '复仇'] },
  { title: '产后调理院', titleEn: 'Maternity Hospital', region: 'kr', year: 2020, rating: 8.3, genres: ['喜剧', '剧情'] },
  { title: '浪漫速成班', titleEn: 'Crash Course in Romance', region: 'kr', year: 2023, rating: 8.2, genres: ['爱情', '喜剧'] },
  { title: '代理公司', titleEn: 'Proxy', region: 'kr', year: 2023, rating: 8.4, genres: ['剧情', '职场'] },
  { title: '车贞淑医生', titleEn: 'Doctor Cha', region: 'kr', year: 2023, rating: 8.5, genres: ['剧情', '喜剧'] },
  { title: '坏妈妈', titleEn: 'Bad Mother', region: 'kr', year: 2023, rating: 8.0, genres: ['剧情', '喜剧'] },
  { title: '假面女王', titleEn: 'The Queen', region: 'kr', year: 2023, rating: 7.8, genres: ['剧情'] },
  { title: '法官大人', titleEn: 'Judge', region: 'kr', year: 2023, rating: 7.9, genres: ['剧情', '犯罪'] },
  { title: '摸心第六感', titleEn: 'Heart of Steel', region: 'kr', year: 2023, rating: 7.6, genres: ['喜剧', '剧情'] },
  { title: '大力女子姜南顺', titleEn: 'Strong Girl', region: 'kr', year: 2023, rating: 7.5, genres: ['喜剧', '动作'] },
  { title: '超能使者', titleEn: 'Moving', region: 'kr', year: 2023, rating: 8.5, genres: ['动作', '奇幻'] },
  { title: '与恶魔有约', titleEn: 'My Demon', region: 'kr', year: 2023, rating: 7.8, genres: ['爱情', '奇幻'] },
  { title: '欢迎回到三达里', titleEn: 'Welcome to Samdal-ri', region: 'kr', year: 2023, rating: 8.0, genres: ['爱情', '剧情'] },
  { title: '死期将至', titleEn: 'Death\'s Game', region: 'kr', year: 2023, rating: 8.3, genres: ['奇幻', '剧情'] },
  { title: '泪之女王', titleEn: 'Queen of Tears', region: 'kr', year: 2024, rating: 8.5, genres: ['爱情', '剧情'] },
  { title: '背着善宰跑', titleEn: 'Lovely Runner', region: 'kr', year: 2024, rating: 8.6, genres: ['爱情', '奇幻'] },
  { title: '虽然不是英雄', titleEn: 'My Heroic Husband', region: 'kr', year: 2024, rating: 7.8, genres: ['奇幻', '喜剧'] },
  { title: '毕业', titleEn: 'Graduation', region: 'kr', year: 2024, rating: 8.3, genres: ['剧情', '爱情'] },
  { title: '联结', titleEn: 'Connection', region: 'kr', year: 2024, rating: 7.9, genres: ['剧情', '惊悚'] },
  { title: '玩家2', titleEn: 'Player 2', region: 'kr', year: 2024, rating: 7.7, genres: ['剧情', '犯罪'] },
  { title: '丑闻', titleEn: 'Scandal', region: 'kr', year: 2024, rating: 7.5, genres: ['剧情'] },
  { title: '监察', titleEn: 'Supervisor', region: 'kr', year: 2024, rating: 7.8, genres: ['剧情', '职场'] },
  { title: '好或坏的东载', titleEn: 'Jung-E', region: 'kr', year: 2024, rating: 7.2, genres: ['剧情'] },
  { title: '杀人者的难堪', titleEn: 'A Killer Paradox', region: 'kr', year: 2024, rating: 7.5, genres: ['悬疑', '犯罪'] },
  { title: '篡位', titleEn: 'Knight Who Secures Me', region: 'kr', year: 2024, rating: 7.6, genres: ['剧情', '奇幻'] },
  { title: '美好的结局', titleEn: 'Beautiful Ending', region: 'kr', year: 2024, rating: 7.8, genres: ['爱情', '剧情'] },
  { title: '金字塔游戏', titleEn: 'Pyramid Game', region: 'kr', year: 2024, rating: 7.9, genres: ['悬疑', '惊悚'] },
  { title: 'V世代', titleEn: 'Gen V', region: 'us', year: 2023, rating: 7.8, genres: ['动作', '科幻'] },
  { title: '漫长的季节', titleEn: 'The Long Season', region: 'cn', year: 2023, rating: 9.4, genres: ['悬疑', '剧情'] },
  { title: '狂飙', titleEn: 'The Knockout', region: 'cn', year: 2023, rating: 8.5, genres: ['剧情', '犯罪'] },
  { title: '三体', titleEn: 'Three-Body', region: 'cn', year: 2023, rating: 8.7, genres: ['科幻', '剧情'] },
  { title: '去有风的地方', titleEn: 'Meet Yourself', region: 'cn', year: 2023, rating: 8.3, genres: ['爱情', '治愈'] },
  { title: '繁花', titleEn: 'Blossoms Shanghai', region: 'cn', year: 2023, rating: 8.7, genres: ['剧情', '年代'] },
  { title: '追风者', titleEn: 'War of Faith', region: 'cn', year: 2024, rating: 8.3, genres: ['剧情', '年代'] },
  { title: '庆余年2', titleEn: 'Joy of Life 2', region: 'cn', year: 2024, rating: 8.5, genres: ['剧情', '古装'] },
  { title: '与凤行', titleEn: 'The Legend of Shen Li', region: 'cn', year: 2024, rating: 7.8, genres: ['爱情', '古装'] },
  { title: '长相思2', titleEn: 'Lost You Forever 2', region: 'cn', year: 2024, rating: 8.0, genres: ['爱情', '古装'] },
  { title: '墨雨云间', titleEn: 'The Princess and the Bounty Hunter', region: 'cn', year: 2024, rating: 7.5, genres: ['爱情', '古装'] },
  { title: '看不见影子的少年', titleEn: 'Shadowless', region: 'cn', year: 2024, rating: 7.8, genres: ['悬疑', '剧情'] },
  { title: '微暗之火', titleEn: 'Dark Flame', region: 'cn', year: 2024, rating: 7.5, genres: ['悬疑', '剧情'] },
  { title: '我的阿勒泰', titleEn: 'My Altay', region: 'cn', year: 2024, rating: 8.8, genres: ['剧情', '爱情'] },
  { title: '新生', titleEn: 'The New Boy', region: 'cn', year: 2024, rating: 7.6, genres: ['悬疑', '剧情'] },
  { title: '城中之城', titleEn: 'City Within', region: 'cn', year: 2024, rating: 7.5, genres: ['剧情', '职场'] },
  { title: '承欢记', titleEn: 'Heirs', region: 'cn', year: 2024, rating: 7.3, genres: ['爱情', '剧情'] },
  { title: '春色寄情人', titleEn: 'Love in the Time of Flowers', region: 'cn', year: 2024, rating: 7.8, genres: ['爱情', '剧情'] },
  { title: '我的反派男友', titleEn: 'My Evil Ex-Boyfriend', region: 'cn', year: 2022, rating: 7.2, genres: ['爱情', '奇幻'] },
  { title: '摇滚梦工厂', titleEn: 'Rock Factory', region: 'cn', year: 2024, rating: 7.0, genres: ['剧情', '音乐'] }
]

async function ensureCollection() {
  try {
    await db.collection('movies').count()
    return true
  } catch (err) {
    if (err.errCode === -502005) {
      try {
        await db.createCollection('movies')
        return true
      } catch (e) {
        console.error('创建集合失败:', e)
        return false
      }
    }
    return true
  }
}

exports.main = async (event, context) => {
  const { type = 'variety', index = 0, batch = false } = event
  
  try {
    const collectionReady = await ensureCollection()
    if (!collectionReady) {
      return { code: -1, message: '集合创建失败' }
    }
    
    const collection = db.collection('movies')
    
    if (batch) {
      let dataArray = []
      let mainCategory = ''
      let typeName = ''
      
      if (type === 'variety') {
        dataArray = VARIETY_DATA
        mainCategory = '综艺'
        typeName = 'variety'
      } else if (type === 'movie') {
        dataArray = MOVIE_DATA
        mainCategory = '电影'
        typeName = 'movie'
      } else if (type === 'drama') {
        dataArray = DRAMA_DATA
        mainCategory = '热剧'
        typeName = 'drama'
      }
      
      const promises = dataArray.map((item, i) => {
        const subCategory = getSubCategory(mainCategory, item.genres, item.region)
        return collection.add({
          data: {
            ...item,
            type: typeName,
            mainCategory,
            subCategory,
            poster: '',
            posterCached: false,
            ratingSource: 'manual',
            description: '',
            cast: [],
            status: typeName === 'movie' ? 'completed' : 'ongoing',
            viewCount: 0,
            isReserve: false,
            rankScore: item.rating * 10,
            refreshAt: null,
            sourceId: `${typeName}_${item.tmdbId || i + 1}`,
            updatedAt: db.serverDate()
          }
        })
      })
      
      await Promise.all(promises)
      
      return { 
        code: 0, 
        message: '批量导入成功', 
        data: { 
          count: dataArray.length,
          type: mainCategory
        } 
      }
    }
    
    let dataArray = []
    let mainCategory = ''
    let typeName = ''
    
    if (type === 'variety') {
      dataArray = VARIETY_DATA
      mainCategory = '综艺'
      typeName = 'variety'
    } else if (type === 'movie') {
      dataArray = MOVIE_DATA
      mainCategory = '电影'
      typeName = 'movie'
    } else if (type === 'drama') {
      dataArray = DRAMA_DATA
      mainCategory = '热剧'
      typeName = 'drama'
    }
    
    const item = dataArray[index]
    if (!item) {
      return { code: 0, message: '完成', data: { done: true, total: dataArray.length } }
    }
    
    const subCategory = getSubCategory(mainCategory, item.genres, item.region)
    
    await collection.add({
      data: {
        ...item,
        type: typeName,
        mainCategory,
        subCategory,
        poster: '',
        posterCached: false,
        ratingSource: 'manual',
        description: '',
        cast: [],
        status: typeName === 'movie' ? 'completed' : 'ongoing',
        viewCount: 0,
        isReserve: false,
        rankScore: item.rating * 10,
        refreshAt: null,
        sourceId: `${typeName}_${item.tmdbId || index + 1}`,
        updatedAt: db.serverDate()
      }
    })
    
    return { code: 0, message: '成功', data: { title: item.title } }
    
  } catch (error) {
    return { code: -1, message: error.message }
  }
}
