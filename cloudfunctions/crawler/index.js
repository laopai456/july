const cloud = require('wx-server-sdk')

cloud.init({ env: 'cloud1-5gl9tqz7860b840c' })

const db = cloud.database()
const _ = db.command

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
  { title: '一年一度喜剧大赛', titleEn: 'Comedy Festival', region: 'cn', year: 2021, rating: 8.6, genres: ['喜剧', '竞技'] },
  { title: '心动的信号', titleEn: 'Heart Signal', region: 'cn', year: 2018, rating: 7.5, genres: ['真人秀', '恋爱'] },
  { title: '换乘恋爱', titleEn: 'Transit Love', region: 'kr', year: 2021, rating: 8.7, genres: ['真人秀', '恋爱'] },
  { title: '快乐再出发', titleEn: 'Happy Reunion', region: 'cn', year: 2022, rating: 9.6, genres: ['真人秀', '旅行'] },
  { title: '花儿与少年', titleEn: 'Flower and Youth', region: 'cn', year: 2014, rating: 7.8, genres: ['真人秀', '旅行'] },
  { title: '爸爸去哪儿', titleEn: 'Where Are We Going, Dad?', region: 'cn', year: 2013, rating: 8.9, genres: ['真人秀', '亲子'] },
  { title: '我是歌手', titleEn: 'I Am a Singer', region: 'cn', year: 2013, rating: 8.2, genres: ['真人秀', '音乐'] },
  { title: '中国好声音', titleEn: 'The Voice of China', region: 'cn', year: 2012, rating: 7.8, genres: ['真人秀', '音乐'] },
  { title: '奔跑吧', titleEn: 'Keep Running', region: 'cn', year: 2014, rating: 7.2, genres: ['真人秀', '游戏'] },
  { title: '蒙面唱将', titleEn: 'Masked Singer', region: 'cn', year: 2016, rating: 8.0, genres: ['真人秀', '音乐'] },
  { title: '声入人心', titleEn: 'Singer Deep', region: 'cn', year: 2018, rating: 9.1, genres: ['真人秀', '音乐'] }
]

const MOVIE_DATA = [
  { title: '流浪地球2', titleEn: 'The Wandering Earth 2', region: 'cn', year: 2023, rating: 8.3, genres: ['科幻', '灾难'], tmdbId: 762104 },
  { title: '满江红', titleEn: 'Full River Red', region: 'cn', year: 2023, rating: 7.0, genres: ['悬疑', '喜剧'], tmdbId: 776957 },
  { title: '消失的她', titleEn: 'Lost in the Stars', region: 'cn', year: 2023, rating: 7.2, genres: ['悬疑', '犯罪'], tmdbId: 1195572 },
  { title: '封神第一部', titleEn: 'Creation of the Gods I', region: 'cn', year: 2023, rating: 7.8, genres: ['奇幻', '动作'], tmdbId: 334021 },
  { title: '奥本海默', titleEn: 'Oppenheimer', region: 'us', year: 2023, rating: 8.8, genres: ['传记', '历史'], tmdbId: 822728 },
  { title: '芭比', titleEn: 'Barbie', region: 'us', year: 2023, rating: 7.6, genres: ['喜剧', '奇幻'], tmdbId: 347801 },
  { title: '蜘蛛侠：纵横宇宙', titleEn: 'Spider-Man: Across the Spider-Verse', region: 'us', year: 2023, rating: 8.9, genres: ['动画', '动作'], tmdbId: 569094 },
  { title: '首尔之春', titleEn: '12.12: The Day', region: 'kr', year: 2023, rating: 8.8, genres: ['历史', '剧情'], tmdbId: 797996 },
  { title: '犯罪都市3', titleEn: 'The Roundup: No Way Out', region: 'kr', year: 2023, rating: 7.5, genres: ['动作', '犯罪'], tmdbId: 753342 },
  { title: '千与千寻', titleEn: 'Spirited Away', region: 'jp', year: 2001, rating: 9.0, genres: ['动画', '奇幻'], tmdbId: 129 },
  { title: '你的名字', titleEn: 'Your Name', region: 'jp', year: 2016, rating: 8.4, genres: ['爱情', '动画'], tmdbId: 345123 },
  { title: '铃芽之旅', titleEn: 'Suzume', region: 'jp', year: 2022, rating: 8.0, genres: ['动画', '奇幻'], tmdbId: 502356 },
  { title: '灌篮高手', titleEn: 'The First Slam Dunk', region: 'jp', year: 2022, rating: 8.3, genres: ['动画', '运动'], tmdbId: 609681 },
  { title: '银河护卫队3', titleEn: 'Guardians of the Galaxy Vol. 3', region: 'us', year: 2023, rating: 8.0, genres: ['动作', '科幻'], tmdbId: 447277 },
  { title: '速度与激情10', titleEn: 'Fast X', region: 'us', year: 2023, rating: 7.0, genres: ['动作', '冒险'], tmdbId: 385497 },
  { title: '变形金刚：超能勇士崛起', titleEn: 'Transformers: Rise of the Beasts', region: 'us', year: 2023, rating: 7.0, genres: ['动作', '科幻'], tmdbId: 646389 },
  { title: '碟中谍7', titleEn: 'Mission: Impossible - Dead Reckoning Part One', region: 'us', year: 2023, rating: 7.8, genres: ['动作', '冒险'], tmdbId: 298618 },
  { title: '夺宝奇兵5', titleEn: 'Indiana Jones and the Dial of Destiny', region: 'us', year: 2023, rating: 6.8, genres: ['动作', '冒险'], tmdbId: 1129910 },
  { title: '小美人鱼', titleEn: 'The Little Mermaid', region: 'us', year: 2023, rating: 6.5, genres: ['奇幻', '爱情'], tmdbId: 707992 },
  { title: '蚁人与黄蜂女：量子狂潮', titleEn: 'Ant-Man and the Wasp: Quantumania', region: 'us', year: 2023, rating: 6.2, genres: ['动作', '科幻'], tmdbId: 886398 }
]

const DRAMA_DATA = [
  { title: '漫长的季节', titleEn: 'The Long Season', region: 'cn', year: 2023, rating: 9.4, genres: ['悬疑', '剧情'], tmdbId: 210235 },
  { title: '狂飙', titleEn: 'The Knockout', region: 'cn', year: 2023, rating: 8.5, genres: ['剧情', '犯罪'], tmdbId: 204052 },
  { title: '三体', titleEn: 'Three-Body', region: 'cn', year: 2023, rating: 8.7, genres: ['科幻', '剧情'], tmdbId: 266570 },
  { title: '去有风的地方', titleEn: 'Meet Yourself', region: 'cn', year: 2023, rating: 8.3, genres: ['爱情', '治愈'], tmdbId: 211373 },
  { title: '黑暗荣耀', titleEn: 'The Glory', region: 'kr', year: 2022, rating: 9.0, genres: ['剧情', '复仇'], tmdbId: 209081 },
  { title: '请回答1988', titleEn: 'Reply 1988', region: 'kr', year: 2015, rating: 9.7, genres: ['剧情', '家庭'], tmdbId: 310486 },
  { title: '孤单又灿烂的神-鬼怪', titleEn: 'Goblin', region: 'kr', year: 2016, rating: 8.8, genres: ['爱情', '奇幻'], tmdbId: 63665 },
  { title: '太阳的后裔', titleEn: 'Descendants of the Sun', region: 'kr', year: 2016, rating: 8.2, genres: ['爱情', '动作'], tmdbId: 306990 },
  { title: '来自星星的你', titleEn: 'My Love from the Star', region: 'kr', year: 2013, rating: 8.2, genres: ['爱情', '奇幻'], tmdbId: 60824 },
  { title: '继承者们', titleEn: 'The Heirs', region: 'kr', year: 2013, rating: 7.8, genres: ['爱情', '剧情'], tmdbId: 57343 },
  { title: '蓝色大海的传说', titleEn: 'The Legend of the Blue Sea', region: 'kr', year: 2016, rating: 8.1, genres: ['爱情', '奇幻'], tmdbId: 66402 },
  { title: '信号', titleEn: 'Signal', region: 'kr', year: 2016, rating: 8.6, genres: ['悬疑', '犯罪'], tmdbId: 64423 },
  { title: '秘密森林', titleEn: 'Stranger', region: 'kr', year: 2017, rating: 8.5, genres: ['悬疑', '犯罪'], tmdbId: 67114 },
  { title: '天空之城', titleEn: 'Sky Castle', region: 'kr', year: 2018, rating: 8.6, genres: ['剧情', '喜剧'], tmdbId: 80074 },
  { title: '梨泰院Class', titleEn: 'Itaewon Class', region: 'kr', year: 2020, rating: 8.2, genres: ['剧情', '爱情'], tmdbId: 93496 },
  { title: '鱿鱼游戏', titleEn: 'Squid Game', region: 'kr', year: 2021, rating: 8.0, genres: ['剧情', '惊悚'], tmdbId: 100044 },
  { title: '非常律师禹英禑', titleEn: 'Extraordinary Attorney Woo', region: 'kr', year: 2022, rating: 8.1, genres: ['剧情', '喜剧'], tmdbId: 198583 },
  { title: '财阀家的小儿子', titleEn: 'Reborn Rich', region: 'kr', year: 2022, rating: 7.8, genres: ['剧情', '奇幻'], tmdbId: 203976 },
  { title: '黑暗荣耀2', titleEn: 'The Glory Part 2', region: 'kr', year: 2023, rating: 9.0, genres: ['剧情', '复仇'], tmdbId: 220900 },
  { title: '医生们', titleEn: 'Doctors', region: 'kr', year: 2016, rating: 7.8, genres: ['爱情', '剧情'], tmdbId: 67231 },
  { title: '举重妖精金福珠', titleEn: 'Weightlifting Fairy Kim Bok-joo', region: 'kr', year: 2016, rating: 8.3, genres: ['爱情', '喜剧'], tmdbId: 67232 },
  { title: '当你沉睡时', titleEn: 'While You Were Sleeping', region: 'kr', year: 2017, rating: 8.1, genres: ['爱情', '奇幻'], tmdbId: 69278 },
  { title: '德鲁纳酒店', titleEn: 'Hotel del Luna', region: 'kr', year: 2019, rating: 8.0, genres: ['爱情', '奇幻'], tmdbId: 89113 },
  { title: '爱的迫降', titleEn: 'Crash Landing on You', region: 'kr', year: 2019, rating: 8.7, genres: ['爱情', '剧情'], tmdbId: 94093 },
  { title: '王国', titleEn: 'Kingdom', region: 'kr', year: 2019, rating: 8.3, genres: ['动作', '恐怖'], tmdbId: 75006 },
  { title: '僵尸校园', titleEn: 'All of Us Are Dead', region: 'kr', year: 2022, rating: 7.5, genres: ['动作', '恐怖'], tmdbId: 96850 },
  { title: '我的解放日志', titleEn: 'My Liberation Notes', region: 'kr', year: 2022, rating: 8.8, genres: ['剧情', '爱情'], tmdbId: 199630 },
  { title: '二十五，二十一', titleEn: 'Twenty-Five Twenty-One', region: 'kr', year: 2022, rating: 8.6, genres: ['爱情', '剧情'], tmdbId: 197633 },
  { title: '异能', titleEn: 'Moving', region: 'kr', year: 2023, rating: 8.5, genres: ['动作', '奇幻'], tmdbId: 114515 },
  { title: '与恶魔有约', titleEn: 'My Demon', region: 'kr', year: 2023, rating: 7.8, genres: ['爱情', '奇幻'], tmdbId: 228110 },
  { title: '欢迎回到三达里', titleEn: 'Welcome to Samdal-ri', region: 'kr', year: 2023, rating: 8.0, genres: ['爱情', '剧情'], tmdbId: 232728 },
  { title: '死期将至', titleEn: 'Death\'s Game', region: 'kr', year: 2023, rating: 8.3, genres: ['奇幻', '剧情'], tmdbId: 230859 },
  { title: '杀人者的难堪', titleEn: 'A Killer Paradox', region: 'kr', year: 2024, rating: 7.5, genres: ['悬疑', '犯罪'], tmdbId: 240512 },
  { title: '泪之女王', titleEn: 'Queen of Tears', region: 'kr', year: 2024, rating: 8.5, genres: ['爱情', '剧情'], tmdbId: 252275 },
  { title: '背着善宰跑', titleEn: 'Lovely Runner', region: 'kr', year: 2024, rating: 8.6, genres: ['爱情', '奇幻'], tmdbId: 255696 },
  { title: '进击的巨人', titleEn: 'Attack on Titan', region: 'jp', year: 2013, rating: 9.0, genres: ['动作', '动画'], tmdbId: 1420 },
  { title: '鬼灭之刃', titleEn: 'Demon Slayer', region: 'jp', year: 2019, rating: 8.7, genres: ['动作', '动画'], tmdbId: 98113 },
  { title: '咒术回战', titleEn: 'Jujutsu Kaisen', region: 'jp', year: 2020, rating: 8.5, genres: ['动作', '动画'], tmdbId: 91020 },
  { title: '间谍过家家', titleEn: 'Spy x Family', region: 'jp', year: 2022, rating: 8.5, genres: ['喜剧', '动画'], tmdbId: 119052 },
  { title: '排球少年', titleEn: 'Haikyuu!!', region: 'jp', year: 2014, rating: 8.6, genres: ['运动', '动画'], tmdbId: 61716 },
  { title: '我的英雄学院', titleEn: 'My Hero Academia', region: 'jp', year: 2016, rating: 8.0, genres: ['动作', '动画'], tmdbId: 61762 },
  { title: '海贼王', titleEn: 'One Piece', region: 'jp', year: 1999, rating: 8.9, genres: ['冒险', '动画'], tmdbId: 37894 },
  { title: '火影忍者', titleEn: 'Naruto', region: 'jp', year: 2002, rating: 8.5, genres: ['动作', '动画'], tmdbId: 31910 },
  { title: '名侦探柯南', titleEn: 'Detective Conan', region: 'jp', year: 1996, rating: 8.0, genres: ['悬疑', '动画'], tmdbId: 13854 },
  { title: '银魂', titleEn: 'Gintama', region: 'jp', year: 2006, rating: 8.6, genres: ['喜剧', '动画'], tmdbId: 13940 },
  { title: '死亡笔记', titleEn: 'Death Note', region: 'jp', year: 2006, rating: 9.0, genres: ['悬疑', '动画'], tmdbId: 8114 },
  { title: '钢之炼金术师', titleEn: 'Fullmetal Alchemist', region: 'jp', year: 2009, rating: 9.1, genres: ['动作', '动画'], tmdbId: 1415 }
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
  const { type = 'variety', index = 0 } = event
  
  try {
    const collectionReady = await ensureCollection()
    if (!collectionReady) {
      return { code: -1, message: '集合创建失败' }
    }
    
    const collection = db.collection('movies')
    
    if (type === 'variety') {
      const item = VARIETY_DATA[index]
      if (!item) {
        return { code: 0, message: '完成', data: { done: true } }
      }
      
      await collection.add({
        data: {
          ...item,
          type: 'variety',
          mainCategory: '综艺',
          poster: '',
          posterCached: false,
          ratingSource: 'manual',
          description: '',
          cast: [],
          status: 'ongoing',
          viewCount: 0,
          sourceId: `variety_${index + 1}`,
          updatedAt: db.serverDate()
        }
      })
      
      return { code: 0, message: '成功', data: { title: item.title } }
    }
    
    if (type === 'movie') {
      const item = MOVIE_DATA[index]
      if (!item) {
        return { code: 0, message: '完成', data: { done: true } }
      }
      
      await collection.add({
        data: {
          ...item,
          type: 'movie',
          mainCategory: '电影',
          poster: '',
          posterCached: false,
          ratingSource: 'tmdb',
          description: '',
          cast: [],
          status: 'completed',
          viewCount: 0,
          sourceId: `movie_${item.tmdbId || index + 1}`,
          updatedAt: db.serverDate()
        }
      })
      
      return { code: 0, message: '成功', data: { title: item.title } }
    }
    
    if (type === 'drama') {
      const item = DRAMA_DATA[index]
      if (!item) {
        return { code: 0, message: '完成', data: { done: true } }
      }
      
      await collection.add({
        data: {
          ...item,
          type: 'drama',
          mainCategory: '热剧',
          poster: '',
          posterCached: false,
          ratingSource: 'tmdb',
          description: '',
          cast: [],
          episodes: 0,
          status: 'completed',
          viewCount: 0,
          sourceId: `drama_${item.tmdbId || index + 1}`,
          updatedAt: db.serverDate()
        }
      })
      
      return { code: 0, message: '成功', data: { title: item.title } }
    }
    
    return { code: -1, message: '未知类型' }
    
  } catch (error) {
    return { code: -1, message: error.message }
  }
}
