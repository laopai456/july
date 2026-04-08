const cloud = require('wx-server-sdk')

cloud.init({ env: 'cloud1-5gl9tqz7860b840c' })

const db = cloud.database()
const _ = db.command

function getSubCategory(mainCategory, genres, region) {
  if (mainCategory === '综艺') {
    const firstGenre = genres[0] || ''
    if (['恋爱', '情感'].includes(firstGenre)) return '恋爱'
    if (['搞笑', '喜剧'].includes(firstGenre)) return '搞笑'
    if (firstGenre === '真人秀') return '真人秀'
    for (let i = 1; i < genres.length; i++) {
      const g = genres[i]
      if (['恋爱', '情感'].includes(g)) return '恋爱'
      if (['搞笑', '喜剧'].includes(g)) return '搞笑'
      if (g === '真人秀') return '真人秀'
    }
    return '搞笑'
  }
  
  if (mainCategory === '电影') {
    const firstGenre = genres[0] || ''
    if (['悬疑', '犯罪', '惊悚'].includes(firstGenre)) return '悬疑'
    if (['爱情', '恋爱'].includes(firstGenre)) return '恋爱'
    if (['喜剧', '搞笑'].includes(firstGenre)) return '喜剧'
    for (let i = 1; i < genres.length; i++) {
      const g = genres[i]
      if (['悬疑', '犯罪', '惊悚'].includes(g)) return '悬疑'
      if (['爱情', '恋爱'].includes(g)) return '恋爱'
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
  { title: 'Running Man', titleEn: 'Running Man', region: 'kr', year: 2010, rating: 8.6, genres: ['真人秀', '游戏'] },
  { title: '新西游记', titleEn: 'New Journey to the West', region: 'kr', year: 2015, rating: 9.5, genres: ['真人秀', '旅行'] },
  { title: '无限挑战', titleEn: 'Infinite Challenge', region: 'kr', year: 2005, rating: 9.6, genres: ['真人秀', '搞笑'] },
  { title: '认识的哥哥', titleEn: 'Knowing Bros', region: 'kr', year: 2015, rating: 8.8, genres: ['真人秀', '脱口秀'] },
  { title: '向往的生活', titleEn: 'A Life You Dream Of', region: 'cn', year: 2017, rating: 7.6, genres: ['真人秀', '生活'] },
  { title: '我独自生活', titleEn: 'I Live Alone', region: 'kr', year: 2013, rating: 8.9, genres: ['真人秀', '生活'] },
  { title: '种地吧', titleEn: 'Farming Boys', region: 'cn', year: 2023, rating: 8.9, genres: ['真人秀', '生活'] },
  { title: '极限挑战', titleEn: 'Go Ahead', region: 'cn', year: 2015, rating: 8.8, genres: ['真人秀', '游戏'] },
  { title: '明星大侦探', titleEn: 'Detective', region: 'cn', year: 2016, rating: 9.0, genres: ['真人秀', '推理'] },
  { title: '一年一度喜剧大赛', titleEn: 'Comedy Festival', region: 'cn', year: 2021, rating: 8.6, genres: ['喜剧', '搞笑'] },
  { title: '心动的信号', titleEn: 'Heart Signal', region: 'cn', year: 2018, rating: 7.5, genres: ['恋爱', '真人秀'] },
  { title: '换乘恋爱', titleEn: 'Transit Love', region: 'kr', year: 2021, rating: 8.7, genres: ['恋爱', '真人秀'] },
  { title: '快乐再出发', titleEn: 'Happy Reunion', region: 'cn', year: 2022, rating: 9.6, genres: ['真人秀', '旅行'] },
  { title: '花儿与少年', titleEn: 'Flower and Youth', region: 'cn', year: 2014, rating: 7.8, genres: ['真人秀', '旅行'] },
  { title: '爸爸去哪儿', titleEn: 'Where Are We Going, Dad?', region: 'cn', year: 2013, rating: 8.9, genres: ['真人秀', '亲子'] },
  { title: '我是歌手', titleEn: 'I Am a Singer', region: 'cn', year: 2013, rating: 8.2, genres: ['真人秀', '音乐'] },
  { title: '中国好声音', titleEn: 'The Voice of China', region: 'cn', year: 2012, rating: 7.8, genres: ['真人秀', '音乐'] },
  { title: '奔跑吧', titleEn: 'Keep Running', region: 'cn', year: 2014, rating: 7.2, genres: ['真人秀', '游戏'] },
  { title: '蒙面唱将', titleEn: 'Masked Singer', region: 'cn', year: 2016, rating: 8.0, genres: ['真人秀', '音乐'] },
  { title: '声入人心', titleEn: 'Singer Deep', region: 'cn', year: 2018, rating: 9.1, genres: ['真人秀', '音乐'] },
  { title: '青春有你', titleEn: 'Youth With You', region: 'cn', year: 2019, rating: 6.5, genres: ['真人秀', '选秀'] },
  { title: '创造营', titleEn: 'Chuang', region: 'cn', year: 2019, rating: 6.8, genres: ['真人秀', '选秀'] },
  { title: '偶像练习生', titleEn: 'Idol Producer', region: 'cn', year: 2018, rating: 7.2, genres: ['真人秀', '选秀'] },
  { title: '明日之子', titleEn: 'The Coming One', region: 'cn', year: 2017, rating: 7.0, genres: ['真人秀', '选秀'] },
  { title: '乘风破浪的姐姐', titleEn: 'Sisters Who Make Waves', region: 'cn', year: 2020, rating: 7.5, genres: ['真人秀', '选秀'] },
  { title: '披荆斩棘的哥哥', titleEn: 'Call Me by Fire', region: 'cn', year: 2021, rating: 7.8, genres: ['真人秀', '选秀'] },
  { title: '脱口秀大会', titleEn: 'Rock & Roast', region: 'cn', year: 2017, rating: 7.9, genres: ['搞笑', '脱口秀'] },
  { title: '吐槽大会', titleEn: 'Roast', region: 'cn', year: 2017, rating: 7.5, genres: ['搞笑', '脱口秀'] },
  { title: '欢乐喜剧人', titleEn: 'Happy Comedian', region: 'cn', year: 2015, rating: 7.8, genres: ['搞笑', '喜剧'] },
  { title: '跨界喜剧王', titleEn: 'Crossover Comedy', region: 'cn', year: 2016, rating: 7.2, genres: ['搞笑', '喜剧'] },
  { title: '我们恋爱吧', titleEn: 'Let\'s Fall in Love', region: 'cn', year: 2019, rating: 7.0, genres: ['恋爱', '真人秀'] },
  { title: '女儿们的恋爱', titleEn: 'Daughters\' Love', region: 'cn', year: 2019, rating: 7.3, genres: ['恋爱', '真人秀'] },
  { title: '喜欢你我也是', titleEn: 'Like You', region: 'cn', year: 2019, rating: 6.8, genres: ['恋爱', '真人秀'] },
  { title: '恋梦空间', titleEn: 'Dream Space', region: 'cn', year: 2019, rating: 6.5, genres: ['恋爱', '真人秀'] },
  { title: '如果爱', titleEn: 'If You Love', region: 'cn', year: 2014, rating: 6.2, genres: ['恋爱', '真人秀'] },
  { title: '我家那闺女', titleEn: 'My Daughter', region: 'cn', year: 2019, rating: 7.4, genres: ['真人秀', '生活'] },
  { title: '我家那小子', titleEn: 'My Boy', region: 'cn', year: 2018, rating: 7.3, genres: ['真人秀', '生活'] },
  { title: '妻子的浪漫旅行', titleEn: 'Viva La Romance', region: 'cn', year: 2018, rating: 7.5, genres: ['真人秀', '旅行'] },
  { title: '幸福三重奏', titleEn: 'Happy Trio', region: 'cn', year: 2018, rating: 7.6, genres: ['真人秀', '生活'] },
  { title: '做家务的男人', titleEn: 'Housework Man', region: 'cn', year: 2019, rating: 7.4, genres: ['真人秀', '生活'] },
  { title: '令人心动的offer', titleEn: 'Exciting Offer', region: 'cn', year: 2019, rating: 8.2, genres: ['真人秀', '职场'] },
  { title: '初入职场的我们', titleEn: 'New Workplace', region: 'cn', year: 2021, rating: 7.5, genres: ['真人秀', '职场'] },
  { title: '奇遇人生', titleEn: 'Once Upon a Trip', region: 'cn', year: 2018, rating: 8.1, genres: ['真人秀', '旅行'] },
  { title: '漫游记', titleEn: 'Roam', region: 'cn', year: 2019, rating: 7.8, genres: ['真人秀', '旅行'] },
  { title: '恰好是少年', titleEn: 'Just Youth', region: 'cn', year: 2021, rating: 8.0, genres: ['真人秀', '旅行'] },
  { title: '哈哈哈哈哈', titleEn: 'HAHAHAHA', region: 'cn', year: 2020, rating: 7.6, genres: ['真人秀', '搞笑'] },
  { title: '德云斗笑社', titleEn: 'Deyun Society', region: 'cn', year: 2020, rating: 8.0, genres: ['搞笑', '喜剧'] },
  { title: '麻花特开心', titleEn: 'Mahua Fun', region: 'cn', year: 2022, rating: 7.2, genres: ['搞笑', '喜剧'] },
  { title: '开播！情景喜剧', titleEn: 'Sitcom', region: 'cn', year: 2022, rating: 6.8, genres: ['搞笑', '喜剧'] }
]

const MOVIE_DATA = [
  { title: '消失的她', titleEn: 'Lost in the Stars', region: 'cn', year: 2023, rating: 7.2, genres: ['悬疑', '犯罪'] },
  { title: '满江红', titleEn: 'Full River Red', region: 'cn', year: 2023, rating: 7.0, genres: ['悬疑', '喜剧'] },
  { title: '看不见的客人', titleEn: 'The Invisible Guest', region: 'es', year: 2016, rating: 8.8, genres: ['悬疑', '犯罪'] },
  { title: '误杀', titleEn: 'Sheep Without a Shepherd', region: 'cn', year: 2019, rating: 7.7, genres: ['悬疑', '犯罪'] },
  { title: '扬名立万', titleEn: 'Be Somebody', region: 'cn', year: 2021, rating: 7.5, genres: ['悬疑', '喜剧'] },
  { title: '唐人街探案', titleEn: 'Detective Chinatown', region: 'cn', year: 2015, rating: 7.7, genres: ['悬疑', '喜剧'] },
  { title: '唐人街探案2', titleEn: 'Detective Chinatown 2', region: 'cn', year: 2018, rating: 7.0, genres: ['悬疑', '喜剧'] },
  { title: '唐人街探案3', titleEn: 'Detective Chinatown 3', region: 'cn', year: 2021, rating: 5.8, genres: ['悬疑', '喜剧'] },
  { title: '嫌疑人X的献身', titleEn: 'The Devotion of Suspect X', region: 'cn', year: 2017, rating: 6.8, genres: ['悬疑', '犯罪'] },
  { title: '心理罪', titleEn: 'Guilty of Mind', region: 'cn', year: 2017, rating: 6.3, genres: ['悬疑', '犯罪'] },
  { title: '记忆大师', titleEn: 'Battle of Memories', region: 'cn', year: 2017, rating: 7.1, genres: ['悬疑', '科幻'] },
  { title: '催眠大师', titleEn: 'The Great Hypnotist', region: 'cn', year: 2014, rating: 7.6, genres: ['悬疑', '惊悚'] },
  { title: '全民目击', titleEn: 'Silent Witness', region: 'cn', year: 2013, rating: 7.7, genres: ['悬疑', '犯罪'] },
  { title: '烈日灼心', titleEn: 'The Dead End', region: 'cn', year: 2015, rating: 8.0, genres: ['悬疑', '犯罪'] },
  { title: '白日焰火', titleEn: 'Black Coal, Thin Ice', region: 'cn', year: 2014, rating: 7.4, genres: ['悬疑', '犯罪'] },
  { title: '心迷宫', titleEn: 'The Coffin in the Mountain', region: 'cn', year: 2014, rating: 8.7, genres: ['悬疑', '犯罪'] },
  { title: '暴裂无声', titleEn: 'Wrath of Silence', region: 'cn', year: 2017, rating: 8.2, genres: ['悬疑', '犯罪'] },
  { title: '南方车站的聚会', titleEn: 'The Wild Goose Lake', region: 'cn', year: 2019, rating: 7.4, genres: ['悬疑', '犯罪'] },
  { title: '少年的你', titleEn: 'Better Days', region: 'cn', year: 2019, rating: 8.3, genres: ['悬疑', '剧情'] },
  { title: '无双', titleEn: 'Project Gutenberg', region: 'cn', year: 2018, rating: 8.0, genres: ['悬疑', '犯罪'] },
  { title: '你的婚礼', titleEn: 'My Love', region: 'cn', year: 2021, rating: 5.2, genres: ['爱情', '剧情'] },
  { title: '我要我们在一起', titleEn: 'Love Will Tear Us Apart', region: 'cn', year: 2021, rating: 6.5, genres: ['爱情', '剧情'] },
  { title: '你的名字', titleEn: 'Your Name', region: 'jp', year: 2016, rating: 8.4, genres: ['爱情', '动画'] },
  { title: '天气之子', titleEn: 'Weathering with You', region: 'jp', year: 2019, rating: 7.2, genres: ['爱情', '动画'] },
  { title: '秒速五厘米', titleEn: '5 Centimeters Per Second', region: 'jp', year: 2007, rating: 8.3, genres: ['爱情', '动画'] },
  { title: '言叶之庭', titleEn: 'The Garden of Words', region: 'jp', year: 2013, rating: 8.2, genres: ['爱情', '动画'] },
  { title: '情书', titleEn: 'Love Letter', region: 'jp', year: 1995, rating: 8.9, genres: ['爱情', '剧情'] },
  { title: '花样年华', titleEn: 'In the Mood for Love', region: 'hk', year: 2000, rating: 8.6, genres: ['爱情', '剧情'] },
  { title: '重庆森林', titleEn: 'Chungking Express', region: 'hk', year: 1994, rating: 8.7, genres: ['爱情', '剧情'] },
  { title: '甜蜜蜜', titleEn: 'Comrades: Almost a Love Story', region: 'hk', year: 1996, rating: 8.8, genres: ['爱情', '剧情'] },
  { title: '春光乍泄', titleEn: 'Happy Together', region: 'hk', year: 1997, rating: 8.9, genres: ['爱情', '剧情'] },
  { title: '泰坦尼克号', titleEn: 'Titanic', region: 'us', year: 1997, rating: 9.4, genres: ['爱情', '灾难'] },
  { title: '怦然心动', titleEn: 'Flipped', region: 'us', year: 2010, rating: 9.1, genres: ['爱情', '剧情'] },
  { title: '恋恋笔记本', titleEn: 'The Notebook', region: 'us', year: 2004, rating: 8.5, genres: ['爱情', '剧情'] },
  { title: '爱乐之城', titleEn: 'La La Land', region: 'us', year: 2016, rating: 8.4, genres: ['爱情', '音乐'] },
  { title: '时空恋旅人', titleEn: 'About Time', region: 'us', year: 2013, rating: 8.8, genres: ['爱情', '奇幻'] },
  { title: '前任3', titleEn: 'The Ex-Files 3', region: 'cn', year: 2017, rating: 6.0, genres: ['爱情', '喜剧'] },
  { title: '后来的我们', titleEn: 'Us and Them', region: 'cn', year: 2018, rating: 6.0, genres: ['爱情', '剧情'] },
  { title: '比悲伤更悲伤的故事', titleEn: 'More Than Blue', region: 'cn', year: 2018, rating: 6.0, genres: ['爱情', '剧情'] },
  { title: '我在时间尽头等你', titleEn: 'Love You Forever', region: 'cn', year: 2020, rating: 5.8, genres: ['爱情', '奇幻'] },
  { title: '你好，李焕英', titleEn: 'Hi, Mom', region: 'cn', year: 2021, rating: 7.8, genres: ['喜剧', '剧情'] },
  { title: '唐伯虎点秋香', titleEn: 'Flirting Scholar', region: 'hk', year: 1993, rating: 8.6, genres: ['喜剧', '爱情'] },
  { title: '大话西游', titleEn: 'A Chinese Odyssey', region: 'hk', year: 1995, rating: 9.2, genres: ['喜剧', '爱情'] },
  { title: '功夫', titleEn: 'Kung Fu Hustle', region: 'hk', year: 2004, rating: 8.7, genres: ['喜剧', '动作'] },
  { title: '少林足球', titleEn: 'Shaolin Soccer', region: 'hk', year: 2001, rating: 8.0, genres: ['喜剧', '动作'] },
  { title: '美人鱼', titleEn: 'The Mermaid', region: 'cn', year: 2016, rating: 6.7, genres: ['喜剧', '爱情'] },
  { title: '西虹市首富', titleEn: 'Hello Mr. Billionaire', region: 'cn', year: 2018, rating: 6.7, genres: ['喜剧', '剧情'] },
  { title: '夏洛特烦恼', titleEn: 'Goodbye Mr. Loser', region: 'cn', year: 2015, rating: 7.7, genres: ['喜剧', '爱情'] },
  { title: '羞羞的铁拳', titleEn: 'Never Say Die', region: 'cn', year: 2017, rating: 6.8, genres: ['喜剧', '爱情'] },
  { title: '飞驰人生', titleEn: 'Pegasus', region: 'cn', year: 2019, rating: 6.9, genres: ['喜剧', '动作'] }
]

const DRAMA_DATA = [
  { title: '黑暗荣耀', titleEn: 'The Glory', region: 'kr', year: 2022, rating: 9.0, genres: ['剧情', '复仇'] },
  { title: '请回答1988', titleEn: 'Reply 1988', region: 'kr', year: 2015, rating: 9.7, genres: ['剧情', '家庭'] },
  { title: '孤单又灿烂的神-鬼怪', titleEn: 'Goblin', region: 'kr', year: 2016, rating: 8.8, genres: ['爱情', '奇幻'] },
  { title: '太阳的后裔', titleEn: 'Descendants of the Sun', region: 'kr', year: 2016, rating: 8.2, genres: ['爱情', '动作'] },
  { title: '来自星星的你', titleEn: 'My Love from the Star', region: 'kr', year: 2013, rating: 8.2, genres: ['爱情', '奇幻'] },
  { title: '继承者们', titleEn: 'The Heirs', region: 'kr', year: 2013, rating: 7.8, genres: ['爱情', '剧情'] },
  { title: '蓝色大海的传说', titleEn: 'The Legend of the Blue Sea', region: 'kr', year: 2016, rating: 8.1, genres: ['爱情', '奇幻'] },
  { title: '信号', titleEn: 'Signal', region: 'kr', year: 2016, rating: 8.6, genres: ['悬疑', '犯罪'] },
  { title: '秘密森林', titleEn: 'Stranger', region: 'kr', year: 2017, rating: 8.5, genres: ['悬疑', '犯罪'] },
  { title: '天空之城', titleEn: 'Sky Castle', region: 'kr', year: 2018, rating: 8.6, genres: ['剧情', '喜剧'] },
  { title: '梨泰院Class', titleEn: 'Itaewon Class', region: 'kr', year: 2020, rating: 8.2, genres: ['剧情', '爱情'] },
  { title: '鱿鱼游戏', titleEn: 'Squid Game', region: 'kr', year: 2021, rating: 8.0, genres: ['剧情', '惊悚'] },
  { title: '非常律师禹英禑', titleEn: 'Extraordinary Attorney Woo', region: 'kr', year: 2022, rating: 8.1, genres: ['剧情', '喜剧'] },
  { title: '财阀家的小儿子', titleEn: 'Reborn Rich', region: 'kr', year: 2022, rating: 7.8, genres: ['剧情', '奇幻'] },
  { title: '黑暗荣耀2', titleEn: 'The Glory Part 2', region: 'kr', year: 2023, rating: 9.0, genres: ['剧情', '复仇'] },
  { title: '医生们', titleEn: 'Doctors', region: 'kr', year: 2016, rating: 7.8, genres: ['爱情', '剧情'] },
  { title: '举重妖精金福珠', titleEn: 'Weightlifting Fairy Kim Bok-joo', region: 'kr', year: 2016, rating: 8.3, genres: ['爱情', '喜剧'] },
  { title: '当你沉睡时', titleEn: 'While You Were Sleeping', region: 'kr', year: 2017, rating: 8.1, genres: ['爱情', '奇幻'] },
  { title: '德鲁纳酒店', titleEn: 'Hotel del Luna', region: 'kr', year: 2019, rating: 8.0, genres: ['爱情', '奇幻'] },
  { title: '爱的迫降', titleEn: 'Crash Landing on You', region: 'kr', year: 2019, rating: 8.7, genres: ['爱情', '剧情'] },
  { title: '王国', titleEn: 'Kingdom', region: 'kr', year: 2019, rating: 8.3, genres: ['动作', '恐怖'] },
  { title: '僵尸校园', titleEn: 'All of Us Are Dead', region: 'kr', year: 2022, rating: 7.5, genres: ['动作', '恐怖'] },
  { title: '我的解放日志', titleEn: 'My Liberation Notes', region: 'kr', year: 2022, rating: 8.8, genres: ['剧情', '爱情'] },
  { title: '二十五，二十一', titleEn: 'Twenty-Five Twenty-One', region: 'kr', year: 2022, rating: 8.6, genres: ['爱情', '剧情'] },
  { title: '异能', titleEn: 'Moving', region: 'kr', year: 2023, rating: 8.5, genres: ['动作', '奇幻'] },
  { title: '与恶魔有约', titleEn: 'My Demon', region: 'kr', year: 2023, rating: 7.8, genres: ['爱情', '奇幻'] },
  { title: '欢迎回到三达里', titleEn: 'Welcome to Samdal-ri', region: 'kr', year: 2023, rating: 8.0, genres: ['爱情', '剧情'] },
  { title: '死期将至', titleEn: 'Death\'s Game', region: 'kr', year: 2023, rating: 8.3, genres: ['奇幻', '剧情'] },
  { title: '杀人者的难堪', titleEn: 'A Killer Paradox', region: 'kr', year: 2024, rating: 7.5, genres: ['悬疑', '犯罪'] },
  { title: '泪之女王', titleEn: 'Queen of Tears', region: 'kr', year: 2024, rating: 8.5, genres: ['爱情', '剧情'] },
  { title: '背着善宰跑', titleEn: 'Lovely Runner', region: 'kr', year: 2024, rating: 8.6, genres: ['爱情', '奇幻'] },
  { title: '浪漫满屋', titleEn: 'Full House', region: 'kr', year: 2004, rating: 8.0, genres: ['爱情', '喜剧'] },
  { title: '巴黎恋人', titleEn: 'Lovers in Paris', region: 'kr', year: 2004, rating: 7.9, genres: ['爱情', '剧情'] },
  { title: '我叫金三顺', titleEn: 'My Lovely Sam Soon', region: 'kr', year: 2005, rating: 8.4, genres: ['爱情', '喜剧'] },
  { title: '宫', titleEn: 'Princess Hours', region: 'kr', year: 2006, rating: 8.1, genres: ['爱情', '剧情'] },
  { title: '咖啡王子一号店', titleEn: 'Coffee Prince', region: 'kr', year: 2007, rating: 8.3, genres: ['爱情', '喜剧'] },
  { title: '花样男子', titleEn: 'Boys Over Flowers', region: 'kr', year: 2009, rating: 8.0, genres: ['爱情', '剧情'] },
  { title: '主君的太阳', titleEn: 'Master\'s Sun', region: 'kr', year: 2013, rating: 8.2, genres: ['爱情', '奇幻'] },
  { title: '没关系，是爱情啊', titleEn: 'It\'s Okay, That\'s Love', region: 'kr', year: 2014, rating: 8.4, genres: ['爱情', '剧情'] },
  { title: '匹诺曹', titleEn: 'Pinocchio', region: 'kr', year: 2014, rating: 8.2, genres: ['爱情', '剧情'] },
  { title: '进击的巨人', titleEn: 'Attack on Titan', region: 'jp', year: 2013, rating: 9.0, genres: ['动作', '动画'] },
  { title: '鬼灭之刃', titleEn: 'Demon Slayer', region: 'jp', year: 2019, rating: 8.7, genres: ['动作', '动画'] },
  { title: '咒术回战', titleEn: 'Jujutsu Kaisen', region: 'jp', year: 2020, rating: 8.5, genres: ['动作', '动画'] },
  { title: '间谍过家家', titleEn: 'Spy x Family', region: 'jp', year: 2022, rating: 8.5, genres: ['喜剧', '动画'] },
  { title: '排球少年', titleEn: 'Haikyuu!!', region: 'jp', year: 2014, rating: 8.6, genres: ['运动', '动画'] },
  { title: '我的英雄学院', titleEn: 'My Hero Academia', region: 'jp', year: 2016, rating: 8.0, genres: ['动作', '动画'] },
  { title: '海贼王', titleEn: 'One Piece', region: 'jp', year: 1999, rating: 8.9, genres: ['冒险', '动画'] },
  { title: '火影忍者', titleEn: 'Naruto', region: 'jp', year: 2002, rating: 8.5, genres: ['动作', '动画'] },
  { title: '名侦探柯南', titleEn: 'Detective Conan', region: 'jp', year: 1996, rating: 8.0, genres: ['悬疑', '动画'] },
  { title: '银魂', titleEn: 'Gintama', region: 'jp', year: 2006, rating: 8.6, genres: ['喜剧', '动画'] },
  { title: '死亡笔记', titleEn: 'Death Note', region: 'jp', year: 2006, rating: 9.0, genres: ['悬疑', '动画'] },
  { title: '钢之炼金术师', titleEn: 'Fullmetal Alchemist', region: 'jp', year: 2009, rating: 9.1, genres: ['动作', '动画'] },
  { title: '灌篮高手', titleEn: 'Slam Dunk', region: 'jp', year: 1993, rating: 9.4, genres: ['运动', '动画'] },
  { title: '龙珠', titleEn: 'Dragon Ball', region: 'jp', year: 1986, rating: 8.6, genres: ['动作', '动画'] },
  { title: '数码宝贝', titleEn: 'Digimon', region: 'jp', year: 1999, rating: 8.4, genres: ['冒险', '动画'] },
  { title: '神奇宝贝', titleEn: 'Pokemon', region: 'jp', year: 1997, rating: 8.3, genres: ['冒险', '动画'] },
  { title: '东京喰种', titleEn: 'Tokyo Ghoul', region: 'jp', year: 2014, rating: 7.8, genres: ['动作', '恐怖'] },
  { title: '刀剑神域', titleEn: 'Sword Art Online', region: 'jp', year: 2012, rating: 7.5, genres: ['动作', '科幻'] },
  { title: 'Re:从零开始的异世界生活', titleEn: 'Re:Zero', region: 'jp', year: 2016, rating: 8.3, genres: ['奇幻', '冒险'] },
  { title: '无职转生', titleEn: 'Mushoku Tensei', region: 'jp', year: 2021, rating: 8.5, genres: ['奇幻', '冒险'] },
  { title: '漫长的季节', titleEn: 'The Long Season', region: 'cn', year: 2023, rating: 9.4, genres: ['悬疑', '剧情'] },
  { title: '狂飙', titleEn: 'The Knockout', region: 'cn', year: 2023, rating: 8.5, genres: ['剧情', '犯罪'] },
  { title: '三体', titleEn: 'Three-Body', region: 'cn', year: 2023, rating: 8.7, genres: ['科幻', '剧情'] },
  { title: '去有风的地方', titleEn: 'Meet Yourself', region: 'cn', year: 2023, rating: 8.3, genres: ['爱情', '治愈'] },
  { title: '甄嬛传', titleEn: 'Empresses in the Palace', region: 'cn', year: 2011, rating: 9.4, genres: ['剧情', '宫廷'] },
  { title: '琅琊榜', titleEn: 'Nirvana in Fire', region: 'cn', year: 2015, rating: 9.4, genres: ['剧情', '古装'] },
  { title: '庆余年', titleEn: 'Joy of Life', region: 'cn', year: 2019, rating: 8.5, genres: ['剧情', '古装'] },
  { title: '陈情令', titleEn: 'The Untamed', region: 'cn', year: 2019, rating: 8.1, genres: ['剧情', '古装'] },
  { title: '知否知否应是绿肥红瘦', titleEn: 'The Story of Ming Lan', region: 'cn', year: 2018, rating: 8.5, genres: ['剧情', '古装'] },
  { title: '隐秘的角落', titleEn: 'The Bad Kids', region: 'cn', year: 2020, rating: 8.8, genres: ['悬疑', '剧情'] },
  { title: '沉默的真相', titleEn: 'The Long Night', region: 'cn', year: 2020, rating: 9.0, genres: ['悬疑', '剧情'] },
  { title: '开端', titleEn: 'Reset', region: 'cn', year: 2022, rating: 8.2, genres: ['悬疑', '科幻'] },
  { title: '苍兰诀', titleEn: 'Love Between Fairy and Devil', region: 'cn', year: 2022, rating: 8.1, genres: ['爱情', '奇幻'] },
  { title: '星汉灿烂', titleEn: 'Love Like the Galaxy', region: 'cn', year: 2022, rating: 8.0, genres: ['爱情', '古装'] },
  { title: '梦华录', titleEn: 'A Dream of Splendor', region: 'cn', year: 2022, rating: 7.9, genres: ['爱情', '古装'] },
  { title: '卿卿日常', titleEn: 'New Life Begins', region: 'cn', year: 2022, rating: 7.6, genres: ['爱情', '喜剧'] },
  { title: '我的人间烟火', titleEn: 'Love\'s Ambition', region: 'cn', year: 2023, rating: 6.8, genres: ['爱情', '剧情'] },
  { title: '长相思', titleEn: 'Lost You Forever', region: 'cn', year: 2023, rating: 8.0, genres: ['爱情', '古装'] },
  { title: '莲花楼', titleEn: 'Mysterious Lotus Casebook', region: 'cn', year: 2023, rating: 8.5, genres: ['悬疑', '古装'] },
  { title: '繁花', titleEn: 'Blossoms Shanghai', region: 'cn', year: 2023, rating: 8.7, genres: ['剧情', '年代'] },
  { title: '与凤行', titleEn: 'The Legend of Shen Li', region: 'cn', year: 2024, rating: 7.8, genres: ['爱情', '古装'] },
  { title: '追风者', titleEn: 'War of Faith', region: 'cn', year: 2024, rating: 8.3, genres: ['剧情', '年代'] }
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
