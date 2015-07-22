//Linear Programming Problem.
function LPP(){
	this.type = 'min';
	this.c = [];

	//var constraint = {values: [1,1], sign: "<", b: 1};
	this.constraints = [];

	var that = this;

	this.getNumberOfLines = function(){
		return that.constraints.length;
	};

	this.getNumberOfColumns = function(){
		return that.c.length;
	};

	this.getType = function(){
		return that.type;
	};

	this.getC = function(index){
		if(index >= 0 && index < that.c.length) return that.c[index];
		else return 0;
	};

	this.getCVector = function(){
		return that.c;
	};

	this.getConstraint = function(index){
		return that.constraints[index];
	};

	this.setType = function(type){
		if( type != "min" && type != "max" ){
			console.log("Error: wrong input of type. This must be 'min' or 'max'.");
			return;
		}
		that.type = type;
	};

	this.addC = function(c){
		that.c.push(c);
	};

	this.addVectorC = function(c){
		that.c = c;
	};

	this.createConstraint = function(valuesIn, signIn, bIn){
		var constraint = {values: valuesIn, sign: signIn, b: bIn};
		that.addConstraint(constraint);
		
	};

	this.addConstraint = function(constraintIn){
		that.constraints.push(constraintIn);
	};

	this.isValid = function(){ // testa se o PPL é válido, ou seja, testa se a estrutura está correta.
		return true;
	};
}

function SimplexTable(lpp){

	this.variablesInBase = []; // lista de índices das variáveis dentro da base.
	//this.variablesOutBase = []; // lista de índices das variáveis fora da base.

	this.slackVariables = []; // aqui fica uma lista dos indices das variaveis de folga.
	this.virtualVariables = []; // aqui fica uma lista dos indices das variaveis virtuais.
	this.st = math.matrix(); // st = simplex table.
	this.lpp = lpp;
	var that = this;

	// função responsável por transforma a restrições de forma adequada para o simplex tabular.
	var getConstraintTable = function(lpp){
		var listOfSlack = [];
		var numberOfSlacks = 0;
		var jump1 = 0;
		for(var i=0; i<lpp.getNumberOfLines(); i++){
			var constraint = lpp.getConstraint(i);
			switch(constraint.sign){
				case '<':
					numberOfSlacks++;
					listOfSlack.push(1);
					that.slackVariables.push(lpp.getNumberOfColumns()+i-jump1);
					break;
				case '>':
					numberOfSlacks++;
					listOfSlack.push(-1);
					that.slackVariables.push(lpp.getNumberOfColumns()+i-jump1);
					break;
				case '=':
					listOfSlack.push(0);
					jump1++;
					break;
			}
		}
		
		var tempTable = [];
		var jump2 = 0;

		for(var i=0; i<lpp.getNumberOfLines(); i++){
			
			var slacks = math.zeros(numberOfSlacks);
			if(listOfSlack[i] == 0) jump2++;
			else{
				slacks.subset(math.index(i-jump2), listOfSlack[i]);
			}

			var constraint = lpp.getConstraint(i);
			
			var line = math.matrix(constraint.values);
			line = math.concat(line,slacks);

			tempTable.push(line);
		}
		tempTable = math.matrix(tempTable);
		return tempTable;

	};

	var isUnity = function(constraintTable,column){
		var count = 0;
		var ones = 0;
		var pos = -1;
		var size = constraintTable.size();
		var lines = size[0];
		for(var i=0; i <lines; i++){
			var value = constraintTable.subset(math.index(i,column));
			if(value != 0) count++;
			if(value == 1){
				ones++;
				pos = i;
			}
		}
		if(count == 1 && ones == 1) return pos;
		else return null;
	}

	// função reponsável por descobrir as variaveis virtuais.
	var setVirtualVariables = function(constraintTable){
		var size = constraintTable.size();
		var identity = math.zeros(size[0]);
		var size = constraintTable.size();
		var countVirtual = size[1];
		
		for(var i=0; i<that.slackVariables.length; i++){
			var index = that.slackVariables[i];
			var unit = isUnity(constraintTable,index);
			if(unit != null){
				identity.subset(math.index(unit),index);
			}
		}
		var basics = identity.map(function(value,index,matrix){
			if(value == 0){
				value = countVirtual;
				that.virtualVariables.push(value);
				countVirtual++;
			}
			return value;
		});

		that.variablesInBase = basics.valueOf();
	};

	var setVirtualColumn = function(constraintTable){
		if(that.virtualVariables.length == 0) return constraintTable;

		var size = constraintTable.size();

		for(var i=0; i<that.variablesInBase.length; i++){
			var index = that.variablesInBase[i];
			if(index >= size[1]){ // se index for maior ou igual ao número de colunas da tabela então index é uma variável virtual.
				var column = [];
				for(var j=0; j<size[0]; j++){
					if(i==j) column.push([1]);
					else column.push([0]);
				}
				column = math.matrix(column);
				constraintTable = math.concat(constraintTable, column);
			}
		}

		return constraintTable;
	};

	var setBColumn = function(lpp,constraintTable){
		
		var listB = [];
		for(var i=0; i<lpp.getNumberOfLines(); i++){
			var constraint = lpp.getConstraint(i);
			listB.push([constraint.b]);
		}
		var b = math.matrix(listB);
		constraintTable = math.concat(constraintTable,b);
		return constraintTable;
	};

	var setCostLine = function(lpp,constraintTable){
		var weights = [];
		var size = constraintTable.size();
		var limit = size[1] - that.virtualVariables.length-1;
		var addVector = [];

		if(that.virtualVariables.length == 0){
			for(var i=0; i<that.variablesInBase.length; i++){
				var variable = that.variablesInBase[i];
				var value = lpp.getC(variable);
				weights.push(value);
			}
			var first = math.matrix(lpp.getCVector());
			var second = math.zeros(that.slackVariables.length + that.virtualVariables.length);
			addVector = math.concat(first,second);
			addVector = math.concat(addVector,[0]);
		}
		else{
			for(var i=0; i<that.variablesInBase.length; i++){
				var value = that.variablesInBase[i];
				if(value >= limit) weights.push(1);
				else weights.push(0);
			}
			var first = math.zeros(limit);
			var second = math.ones(that.virtualVariables.length);
			addVector = math.concat(first,second);
			addVector = math.concat(addVector,[0]);
		}
		weights = math.matrix(weights);
		
		var costs = math.multiply(weights,constraintTable);
		costs = math.subtract(costs,addVector);
		for(var i=0; i<that.variablesInBase.length; i++){
			var value = that.variablesInBase[i];
			costs.subset(math.index(value),0);
		}

		constraintTable = math.concat([costs.valueOf()],constraintTable,0);

		return constraintTable;
	}

	this.transformFromLPPToSimplexTable = function(){
		var constraintTable = getConstraintTable(that.lpp);
		setVirtualVariables(constraintTable);
		constraintTable = setVirtualColumn(constraintTable);
		constraintTable = setBColumn(that.lpp,constraintTable);

		that.st = setCostLine(that.lpp,constraintTable);
	};

	this.hasVirtualVariableOnBase = function(){
		if(that.virtualVariables.length == 0) return false;
		var size = that.st.size();
		var limit = size[1] -1 - that.virtualVariables.length;
		for(var i=0; i<that.variablesInBase.length; i++){
			if(that.variablesInBase[i] >= limit){
				return true;
			}
		}
		return false;
	};

	//TODO
	this.variableToInBase = function(){
		return null;
	};

	//TODO
	this.varialbeToOutBase = function(){
		return null;
	};

	this.isGreatTable = function(){
		var vIn = that.variableToInBase();
		var vOut = that.varialbeToOutBase();
		if(vIn == null || vOut == null) return true;
		else return false;
	};

	//TODO
	var makePivoting = function(vIn, vOut){

	};

	this.nextTable = function(){
		var vIn = that.variableToInBase();
		var vOut = that.varialbeToOutBase();
		for(var i=0; i<that.variablesInBase.length; i++){
			if(vOut == that.variablesInBase[i]){
				that.variablesInBase[i] = vIn;
				break;
			}
		}
		makePivoting(vIn, vOut);
	};

	//TODOing
	this.removeVirtualVariables = function(){
		if(that.virtualVariables.length == 0) return;
		if(that.hasVirtualVariableOnBase()) return;
		var size = that.st.size();
		var limit = size[1] -1 - that.virtualVariables.length;
		var b = that.st.subset(math.index([1,size[0]],size[1]-1));
		var newSt = that.st.subset(math.index([1,size[0]],[0,limit]));
		newSt = math.concat(newSt,b);
		console.log(newSt);
		that.virtualVariables = [];
		newSt = setCostLine(that.lpp,newSt);
		console.log(newSt);
	};

	this.getSolution = function(){
		var size = that.st.size();
		var solution = math.zeros(size[1]-1);
		var b = that.st.subset(math.index([1,size[0]],size[1]-1));

		for(var i=0; i<that.variablesInBase.length; i++){
			var index = that.variablesInBase[i];
			var value = b.subset(math.index(i,0));
			solution.subset(math.index(index),value);
		}
		return solution.valueOf();
	};

	this.getImage = function(){
		var size = that.st.size();
		var image = that.st.subset(math.index(0,size[1]-1));
		return image;
	};
}

function Simplex(lpp){
	this.lpp = lpp; // objeto que representa o ppl de acordo com a classe definida acima;

	this.firstFase = []; // lista das tabelas de cada iteração do simplex da primeira fase.
	this.secondFase = []; // lista das tabelas de cada iteração do simplex da segunda fase.
	this.solution = null;

	var that = this;

	this.calculateSimplex2Fases = function(){
		var table = new SimplexTable(that.lpp);
		table.transformFromLPPToSimplexTable();
		that.firstFase.push(table);
		while(table.hasVirtualVariableOnBase()){
			table.nextTable();
			that.firstFase.push(table);
		}
		table.removeVirtualVariables();
		that.secondFase.push(table);
		while(!table.isGreatTable()){
			table.nextTable();
			that.secondFase.push(table);
		}
		that.solution = table;
		return table;
	};

	this.getSolution = function(){
		return that.solution;
	};

	this.getStepsFirstFase = function(){
		return that.firstFase;
	};

	this.getStepsSecondFase = function(){
		return that.firstFase;
	};
}
