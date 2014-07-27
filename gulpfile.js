var gulp = require('gulp'); 

var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var htmlreplace = require('gulp-html-replace');

gulp.task('lint', function() {
	return gulp.src('src/*.js')
		.pipe(jshint())
		.pipe(jshint.reporter('default'));
});

gulp.task('app', function() {
	return gulp.src(['src/libs/*.js', 'src/*.js'])
		.pipe(gulp.dest('dist'));
});

// Build minified production version including code for analytics
gulp.task('app-min', function() {
	return gulp.src(['src/libs/*.js', 'src/production/ga.js', 'src/*.js'])
		.pipe(concat('app.min.js'))
		.pipe(uglify())
		.pipe(gulp.dest('dist'));
});

gulp.task('html', function() {
	return gulp.src('src/index.html')
		.pipe(rename('index_uncompressed.html'))
		.pipe(gulp.dest('dist'));
});

gulp.task('html-min', function() {
	return gulp.src('src/index.html')
		.pipe(htmlreplace({
			'app': 'app.min.js'
		}))
		.pipe(gulp.dest('dist'));
});

gulp.task('watch', function() {
	gulp.watch('src/*.js', ['lint', 'app', 'app-min']);
	gulp.watch('src/index.html', ['html', 'html-min']);
});

gulp.task('default', ['lint', 'app', 'app-min', 'html', 'html-min', 'watch']);
