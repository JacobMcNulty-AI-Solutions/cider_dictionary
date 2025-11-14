// Database debugging utility
import { sqliteService } from '../services/database/sqlite';

export async function debugDatabaseState() {
  console.log('=== DATABASE DEBUG START ===');

  try {
    // Check ciders
    const ciders = await sqliteService.getAllCiders();
    console.log(`Total ciders in database: ${ciders.length}`);

    if (ciders.length > 0) {
      console.log('Sample cider:', {
        id: ciders[0].id,
        name: ciders[0].name,
        brand: ciders[0].brand,
        rating: ciders[0].overallRating,
        createdAt: ciders[0].createdAt
      });

      // Check all cider names
      console.log('All cider names:',ciders.map(c => c.name));
    }

    // Check experiences
    const experiences = await sqliteService.getAllExperiences();
    console.log(`Total experiences in database: ${experiences.length}`);

    if (experiences.length > 0) {
      console.log('Sample experience:', {
        id: experiences[0].id,
        ciderId: experiences[0].ciderId,
        venue: experiences[0].venue.name,
        price: experiences[0].price,
        date: experiences[0].date
      });
    }

    // Check basic analytics
    const analytics = await sqliteService.getBasicAnalytics();
    console.log('Basic analytics:', analytics);

  } catch (error) {
    console.error('Database debug error:', error);
  }

  console.log('=== DATABASE DEBUG END ===');
}

export async function checkAnalyticsData() {
  console.log('=== ANALYTICS DATA CHECK ===');

  try {
    const ciders = await sqliteService.getAllCiders();
    const experiences = await sqliteService.getAllExperiences();

    console.log('Ciders count:', ciders.length);
    console.log('Experiences count:', experiences.length);

    // Check time range filtering
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const experiencesInRange = experiences.filter(exp => exp.date >= threeMonthsAgo);
    console.log('Experiences in last 3 months:', experiencesInRange.length);

    if (experiencesInRange.length > 0) {
      console.log('Date range:', {
        oldest: experiencesInRange[experiencesInRange.length - 1].date,
        newest: experiencesInRange[0].date
      });
    }

    // Check if ciders have corresponding experiences
    const cidersInRange = ciders.filter(cider =>
      experiencesInRange.some(exp => exp.ciderId === cider.id)
    );
    console.log('Ciders with experiences in range:', cidersInRange.length);

  } catch (error) {
    console.error('Analytics check error:', error);
  }

  console.log('=== ANALYTICS DATA CHECK END ===');
}
