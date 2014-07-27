var gulp = require('gulp'); 

var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var htmlreplace = require('gulp-html-replace');
var minifycss = require('gulp-minify-css');

gulp.task('lint', function() {
	return gulp.src('src/*.js')
		.pipe(jshint())
		.pipe(jshint.reporter('default'));
});

gulp.task('data', function() {
	return gulp.src(['src/data/**'])
		.pipe(gulp.dest('dist/data'));
});

// Build minified production version including code for analytics
gulp.task('app-min', function() {
	return gulp.src(['src/libs/*.js', 'src/production/ga.js', 'src/*.js'])
		.pipe(concat('app.min.js'))
		.pipe(uglify())
		.pipe(gulp.dest('dist'));
});

gulp.task('css-min', function() {
	return gulp.src('src/style.css')
		.pipe(minifycss())
		.pipe(gulp.dest('dist'));
});

// The production html file uses only one script file
gulp.task('html-min', function() {
	return gulp.src('src/index.html')
		.pipe(htmlreplace({
			'app': {
				src: 'app.min.js',
				tpl: '<script src="%s" defer></script>'
			}
		}))
		.pipe(gulp.dest('dist'));
});

gulp.task('watch', function() {
	gulp.watch('src/**/*.js', ['lint', 'app-min']);
	gulp.watch('src/index.html', ['html-min']);
});

gulp.task('default', ['lint', 'data', 'app-min', 'css-min', 'html-min', 'watch']);
