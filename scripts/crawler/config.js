module.exports = {
  tmdb: {
    apiKey: '96ac6a609d077c2d49da61e620697ea7',
    baseUrl: 'https://api.themoviedb.org/3',
    imageBaseUrl: 'https://image.tmdb.org/t/p/w500',
    language: 'zh-CN'
  },
  douban: {
    baseUrl: 'https://movie.douban.com',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    }
  },
  cloud: {
    envId: 'cloud1-5gl9tqz7860b840c'
  },
  categories: {
    variety: {
      mainCategory: '综艺',
      subCategories: ['搞笑', '竞技', '恋爱']
    },
    movie: {
      mainCategory: '电影',
      subCategories: ['国内', '国外']
    },
    drama: {
      mainCategory: '热剧',
      subCategories: ['国内', '日剧', '韩剧']
    }
  },
  output: {
    dir: './output',
    filename: 'movies.json'
  }
}
